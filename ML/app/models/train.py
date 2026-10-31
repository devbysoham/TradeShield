"""
app/models/train.py — End-to-end training, calibration, evaluation and
persistence for the USD/INR multi-horizon quantile forecast.

Architecture overview
─────────────────────
For each horizon h ∈ {1, 3, 5, 10, 15} we train a set of quantile models at
α ∈ {0.05, 0.25, 0.50, 0.75, 0.95}.  A model is either XGBoost
(reg:quantileerror, default) or LightGBM (quantile regression), selected via
``ModelBackend`` in the config.

Walk-forward evaluation
───────────────────────
The history is split into three contiguous, non-overlapping blocks:

    ┌──────────────────────────────┬──────────────────┬──────────────────┐
    │        TRAIN + WF-CV         │   CALIBRATION    │    TEST (held)   │
    │  ~60 %                       │   ~20 %          │   ~20 %          │
    └──────────────────────────────┴──────────────────┴──────────────────┘

Walk-forward (WF-CV) inside the train block uses ``TimeSeriesSplit`` expanding
windows for hyper-parameter tuning via ``RandomizedSearchCV``.  The
calibration block (CQR) and the test block are *never* seen during fitting.

Calibration: Split Conformal Quantile Regression (CQR)
───────────────────────────────────────────────────────
Given a model that predicts (q_lo, q_hi) and a calibration set:

    score_i  = max(q_lo_i − y_i,  y_i − q_hi_i)        # non-conformity score

    offset   = quantile(scores, ⌈(n+1)(1−α)/n⌉)        # target coverage α

    adjusted_lo = q_lo − offset
    adjusted_hi = q_hi + offset

This ensures the empirical coverage is ≥ 1−α on exchangeable future data.

Evaluation metrics (always reported, never hidden)
──────────────────────────────────────────────────
For each horizon h:
  • MAE vs. zero-return (no-change) baseline
  • Direction accuracy + bootstrap 95% CI  (10 000 resamples)
  • Pinball loss per quantile
  • ``has_edge`` : bool — True iff model MAE < baseline MAE  AND
                          direction accuracy CI lower bound > 0.50

Persistence
───────────
Artefacts are saved to ``<artefact_dir>/<version>/`` where version is a UTC
timestamp string ``YYYYMMDD_HHMMSS``.  Each version folder contains:

    models.joblib          — dict mapping (horizon, quantile) → fitted model
    scalers.joblib         — dict mapping horizon → fitted StandardScaler
    calibration.joblib     — dict mapping horizon → CQR offset (float)
    metadata.json          — feature list, metrics, config snapshot
    registry_entry.json    — written by ModelRegistry for DB look-up

The DB ``model_registry`` table mirrors the metadata for API consumers.

Public API
──────────
    from app.models.train import retrain, TrainResult

    result = retrain()                 # pulls fresh data, trains, saves
    result.metrics                     # dict of HorizonMetrics keyed by h
    result.version                     # version tag string
"""

from __future__ import annotations

import json
import logging
import time
import warnings
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import RandomizedSearchCV, TimeSeriesSplit
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants — mirrors app/features/engineer.py to avoid import coupling
# ---------------------------------------------------------------------------

TARGET_HORIZONS: list[int] = [1, 3, 5, 10, 15]
QUANTILES: list[float] = [0.05, 0.25, 0.50, 0.75, 0.95]

#: Nominal coverage for CQR calibration (90 % interval = 0.95 − 0.05).
NOMINAL_COVERAGE: float = 0.90

#: Fractions for the three data blocks (must sum to 1.0).
_TRAIN_FRAC: float = 0.60
_CALIB_FRAC: float = 0.20
_TEST_FRAC: float = 0.20

#: Number of bootstrap resamples for the direction-accuracy CI.
_BOOTSTRAP_N: int = 10_000

#: Default artefact root (git-ignored).
_DEFAULT_ARTEFACT_DIR = Path("app/models/artefacts")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

ModelBackend = Literal["xgboost", "lightgbm"]


@dataclass
class TrainConfig:
    """Hyper-parameters and topology switches for the training run."""

    backend: ModelBackend = "xgboost"

    # ── RandomizedSearch budget ───────────────────────────────────────────
    n_iter_search: int = 20          # number of random hyper-param draws
    cv_splits: int = 5               # TimeSeriesSplit folds inside train block
    random_state: int = 42

    # ── Model defaults (overridden by search) ─────────────────────────────
    n_estimators: int = 400
    learning_rate: float = 0.05
    max_depth: int = 4
    subsample: float = 0.8
    colsample_bytree: float = 0.8
    min_child_weight: int = 5        # XGBoost only
    num_leaves: int = 31             # LightGBM only

    # ── Misc ──────────────────────────────────────────────────────────────
    n_jobs: int = -1
    early_stopping_rounds: int = 30
    verbose_eval: bool = False

    artefact_dir: Path = _DEFAULT_ARTEFACT_DIR


# ---------------------------------------------------------------------------
# Data containers
# ---------------------------------------------------------------------------


@dataclass
class HorizonMetrics:
    """Per-horizon evaluation results."""

    horizon: int
    model_mae: float
    baseline_mae: float           # zero-return baseline
    mae_improvement: float        # baseline_mae − model_mae  (positive → better)
    direction_accuracy: float
    dir_acc_ci_lower: float       # bootstrap 95% CI
    dir_acc_ci_upper: float
    pinball: dict[float, float]   # quantile → pinball loss
    empirical_coverage_90: float  # coverage of the 90% CQR interval on test
    cqr_offset: float
    has_edge: bool                # see module docstring


@dataclass
class TrainResult:
    """Container returned by :func:`retrain`."""

    version: str
    metrics: dict[int, HorizonMetrics]   # keyed by horizon
    feature_names: list[str]
    artefact_path: Path
    config: TrainConfig
    train_end_date: str
    calib_end_date: str
    test_end_date: str
    n_train: int
    n_calib: int
    n_test: int

    def summary(self) -> str:
        """Human-readable one-liner per horizon."""
        lines = [f"TrainResult v={self.version}  n_train={self.n_train}"]
        for h, m in sorted(self.metrics.items()):
            edge = "✓ EDGE" if m.has_edge else "✗ no-edge"
            lines.append(
                f"  h={h:>2}d  MAE={m.model_mae:.5f} "
                f"(baseline {m.baseline_mae:.5f})  "
                f"DirAcc={m.direction_accuracy:.1%} "
                f"[{m.dir_acc_ci_lower:.1%},{m.dir_acc_ci_upper:.1%}]  "
                f"Cov90={m.empirical_coverage_90:.1%}  {edge}"
            )
        return "\n".join(lines)


# ---------------------------------------------------------------------------
# Model factory
# ---------------------------------------------------------------------------


def _make_model(
    quantile: float,
    cfg: TrainConfig,
    params: dict[str, Any] | None = None,
) -> Any:
    """Instantiate a single quantile estimator (XGBoost or LightGBM).

    Parameters
    ----------
    quantile:
        Target quantile α ∈ (0, 1).
    cfg:
        Training configuration.
    params:
        Optional hyper-param overrides (from search).
    """
    base_params: dict[str, Any] = dict(
        n_estimators=cfg.n_estimators,
        learning_rate=cfg.learning_rate,
        max_depth=cfg.max_depth,
        subsample=cfg.subsample,
        colsample_bytree=cfg.colsample_bytree,
        random_state=cfg.random_state,
        n_jobs=cfg.n_jobs,
    )
    if params:
        base_params.update(params)

    if cfg.backend == "xgboost":
        import xgboost as xgb  # local import — optional dep

        return xgb.XGBRegressor(
            objective="reg:quantileerror",
            quantile_alpha=quantile,
            tree_method="hist",
            verbosity=0,
            **{k: v for k, v in base_params.items() if k != "random_state"},
            seed=cfg.random_state,
        )

    elif cfg.backend == "lightgbm":
        import lightgbm as lgb  # local import — optional dep

        return lgb.LGBMRegressor(
            objective="quantile",
            alpha=quantile,
            num_leaves=cfg.num_leaves,
            n_estimators=base_params["n_estimators"],
            learning_rate=base_params["learning_rate"],
            max_depth=base_params["max_depth"],
            subsample=base_params["subsample"],
            colsample_bytree=base_params["colsample_bytree"],
            random_state=cfg.random_state,
            n_jobs=cfg.n_jobs,
            verbose=-1,
        )

    raise ValueError(f"Unknown backend: {cfg.backend!r}")


def _search_space(backend: ModelBackend) -> dict[str, Any]:
    """Return a small RandomizedSearch parameter distribution."""
    if backend == "xgboost":
        return {
            "n_estimators": [200, 400, 600, 800],
            "learning_rate": [0.01, 0.03, 0.05, 0.10],
            "max_depth": [3, 4, 5, 6],
            "subsample": [0.7, 0.8, 0.9, 1.0],
            "colsample_bytree": [0.6, 0.7, 0.8, 1.0],
            "min_child_weight": [3, 5, 10, 20],
        }
    else:  # lightgbm
        return {
            "n_estimators": [200, 400, 600, 800],
            "learning_rate": [0.01, 0.03, 0.05, 0.10],
            "num_leaves": [20, 31, 50, 70],
            "subsample": [0.7, 0.8, 0.9, 1.0],
            "colsample_bytree": [0.6, 0.7, 0.8, 1.0],
        }


# ---------------------------------------------------------------------------
# Pinball / evaluation helpers
# ---------------------------------------------------------------------------


def _pinball_loss(y_true: np.ndarray, y_pred: np.ndarray, q: float) -> float:
    """Mean pinball (check) loss for quantile q."""
    err = y_true - y_pred
    return float(np.mean(np.where(err >= 0, q * err, (q - 1) * err)))


def _direction_accuracy_with_ci(
    y_true: np.ndarray,
    y_pred_median: np.ndarray,
    n_boot: int = _BOOTSTRAP_N,
    rng: np.random.Generator | None = None,
) -> tuple[float, float, float]:
    """Direction accuracy with a bootstrap 95% confidence interval.

    Returns
    -------
    (accuracy, ci_lower, ci_upper)
    """
    if rng is None:
        rng = np.random.default_rng(seed=0)

    correct = (np.sign(y_true) == np.sign(y_pred_median)).astype(float)
    point_acc = float(correct.mean())

    n = len(correct)
    boot_accs = np.empty(n_boot)
    for i in range(n_boot):
        idx = rng.integers(0, n, size=n)
        boot_accs[i] = correct[idx].mean()

    ci_lo = float(np.percentile(boot_accs, 2.5))
    ci_hi = float(np.percentile(boot_accs, 97.5))
    return point_acc, ci_lo, ci_hi


def _mae(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.mean(np.abs(y_true - y_pred)))


# ---------------------------------------------------------------------------
# CQR calibration
# ---------------------------------------------------------------------------


def _cqr_fit(
    y_true: np.ndarray,
    q_lo: np.ndarray,
    q_hi: np.ndarray,
    coverage: float = NOMINAL_COVERAGE,
) -> float:
    """Compute the CQR conformity offset on a held-out calibration set.

    The non-conformity score for each observation:
        s_i = max(q_lo_i − y_i,  y_i − q_hi_i)

    The offset is the ⌈(n+1)(1−α)⌉/n quantile of {s_i}, where α = 1−coverage.

    Parameters
    ----------
    y_true, q_lo, q_hi:
        Calibration targets and quantile predictions (same length n).
    coverage:
        Desired marginal coverage (e.g. 0.90).

    Returns
    -------
    float
        The conformal offset to add/subtract from q_lo / q_hi at test time.
    """
    n = len(y_true)
    scores = np.maximum(q_lo - y_true, y_true - q_hi)
    alpha = 1.0 - coverage
    level = np.ceil((n + 1) * (1 - alpha)) / n
    level = min(level, 1.0)           # cap at 1 to avoid out-of-bound quantile
    offset = float(np.quantile(scores, level))
    return offset


def _cqr_predict(
    q_lo: np.ndarray,
    q_hi: np.ndarray,
    offset: float,
) -> tuple[np.ndarray, np.ndarray]:
    """Apply the CQR offset to raw quantile predictions."""
    return q_lo - offset, q_hi + offset


def _empirical_coverage(
    y_true: np.ndarray,
    adj_lo: np.ndarray,
    adj_hi: np.ndarray,
) -> float:
    """Fraction of y_true that falls within [adj_lo, adj_hi]."""
    return float(np.mean((y_true >= adj_lo) & (y_true <= adj_hi)))


# ---------------------------------------------------------------------------
# Walk-forward hyper-parameter search (median model proxy)
# ---------------------------------------------------------------------------


def _tune_hyperparams(
    X_train: np.ndarray,
    y_train: np.ndarray,
    cfg: TrainConfig,
) -> dict[str, Any]:
    """Run RandomizedSearchCV on the median (0.50) quantile model.

    The best params are then reused for all other quantiles.  Tuning on the
    median is a reasonable proxy and avoids a 5× search budget.

    Parameters
    ----------
    X_train, y_train:
        Scaled training features and the target for one horizon.
    cfg:
        Training configuration.

    Returns
    -------
    dict
        Best hyper-parameter mapping (excluding quantile-specific keys).
    """
    tss = TimeSeriesSplit(n_splits=cfg.cv_splits)
    base_model = _make_model(0.50, cfg)

    space = _search_space(cfg.backend)

    # XGBoost key remapping for sklearn compat
    if cfg.backend == "xgboost":
        space = {
            "n_estimators": space["n_estimators"],
            "learning_rate": space["learning_rate"],
            "max_depth": space["max_depth"],
            "subsample": space["subsample"],
            "colsample_bytree": space["colsample_bytree"],
        }

    search = RandomizedSearchCV(
        estimator=base_model,
        param_distributions=space,
        n_iter=cfg.n_iter_search,
        cv=tss,
        scoring="neg_mean_absolute_error",
        refit=False,
        n_jobs=1,                  # parallelism is inside XGBoost/LGBM
        random_state=cfg.random_state,
        error_score="raise",
    )
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        search.fit(X_train, y_train)

    best = dict(search.best_params_)
    logger.debug("Best hyper-params: %s", best)
    return best


# ---------------------------------------------------------------------------
# Per-horizon training block
# ---------------------------------------------------------------------------


def _train_one_horizon(
    h: int,
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_calib: np.ndarray,
    y_calib: np.ndarray,
    X_test: np.ndarray,
    y_test: np.ndarray,
    cfg: TrainConfig,
    rng: np.random.Generator,
) -> tuple[dict[float, Any], float, HorizonMetrics]:
    """Train all quantile models for one horizon, calibrate and evaluate.

    Returns
    -------
    models : dict[float, fitted_model]   — keyed by quantile α
    cqr_offset : float
    metrics : HorizonMetrics
    """
    logger.info("  Horizon h=%dd — tuning hyper-params …", h)
    t0 = time.perf_counter()
    best_params = _tune_hyperparams(X_train, y_train, cfg)
    logger.info("  h=%dd — search done in %.1fs", h, time.perf_counter() - t0)

    # ── Fit one model per quantile ────────────────────────────────────────
    models: dict[float, Any] = {}
    for q in QUANTILES:
        m = _make_model(q, cfg, params=best_params)
        m.fit(X_train, y_train)
        models[q] = m
        logger.debug("  h=%dd  q=%.2f fitted", h, q)

    # ── CQR calibration on the calibration block ──────────────────────────
    q_lo_calib = models[0.05].predict(X_calib)
    q_hi_calib = models[0.95].predict(X_calib)
    cqr_offset = _cqr_fit(y_calib, q_lo_calib, q_hi_calib, NOMINAL_COVERAGE)
    logger.info("  h=%dd  CQR offset=%.6f", h, cqr_offset)

    # ── Evaluation on the held-out test block ─────────────────────────────
    q_lo_test = models[0.05].predict(X_test)
    q_hi_test = models[0.95].predict(X_test)
    q_med_test = models[0.50].predict(X_test)

    adj_lo, adj_hi = _cqr_predict(q_lo_test, q_hi_test, cqr_offset)
    cov90 = _empirical_coverage(y_test, adj_lo, adj_hi)

    model_mae = _mae(y_test, q_med_test)
    baseline_mae = _mae(y_test, np.zeros_like(y_test))
    mae_imp = baseline_mae - model_mae

    dir_acc, ci_lo, ci_hi = _direction_accuracy_with_ci(y_test, q_med_test, rng=rng)

    pinball: dict[float, float] = {}
    for q in QUANTILES:
        y_pred_q = models[q].predict(X_test)
        pinball[q] = _pinball_loss(y_test, y_pred_q, q)

    has_edge = bool(model_mae < baseline_mae and ci_lo > 0.50)

    metrics = HorizonMetrics(
        horizon=h,
        model_mae=model_mae,
        baseline_mae=baseline_mae,
        mae_improvement=mae_imp,
        direction_accuracy=dir_acc,
        dir_acc_ci_lower=ci_lo,
        dir_acc_ci_upper=ci_hi,
        pinball=pinball,
        empirical_coverage_90=cov90,
        cqr_offset=cqr_offset,
        has_edge=has_edge,
    )

    return models, cqr_offset, metrics


# ---------------------------------------------------------------------------
# Persistence helpers
# ---------------------------------------------------------------------------


def _version_tag() -> str:
    """UTC timestamp string suitable for a directory name."""
    return datetime.now(tz=timezone.utc).strftime("%Y%m%d_%H%M%S")


def _save_artefacts(
    version: str,
    models_by_horizon: dict[int, dict[float, Any]],
    scalers_by_horizon: dict[int, StandardScaler],
    offsets_by_horizon: dict[int, float],
    feature_names: list[str],
    metrics: dict[int, HorizonMetrics],
    cfg: TrainConfig,
    extra_meta: dict[str, Any],
    artefact_dir: Path,
) -> Path:
    """Persist all artefacts for one training run under a versioned folder.

    Layout
    ──────
    <artefact_dir>/<version>/
        models.joblib
        scalers.joblib
        calibration.joblib
        metadata.json

    Returns
    -------
    Path
        The versioned artefact directory.
    """
    version_dir = artefact_dir / version
    version_dir.mkdir(parents=True, exist_ok=True)

    joblib.dump(models_by_horizon,   version_dir / "models.joblib")
    joblib.dump(scalers_by_horizon,  version_dir / "scalers.joblib")
    joblib.dump(offsets_by_horizon,  version_dir / "calibration.joblib")

    # Serialise metrics (convert dataclass → plain dict).
    metrics_serial: dict[str, Any] = {}
    for h, m in metrics.items():
        md = asdict(m)
        # json doesn't like float keys in pinball dict
        md["pinball"] = {str(k): v for k, v in md["pinball"].items()}
        metrics_serial[str(h)] = md

    metadata: dict[str, Any] = {
        "version": version,
        "backend": cfg.backend,
        "feature_names": feature_names,
        "horizons": TARGET_HORIZONS,
        "quantiles": QUANTILES,
        "nominal_coverage": NOMINAL_COVERAGE,
        "metrics": metrics_serial,
        **extra_meta,
    }
    with open(version_dir / "metadata.json", "w", encoding="utf-8") as fh:
        json.dump(metadata, fh, indent=2)

    logger.info("Artefacts saved → %s", version_dir)
    return version_dir


def _load_artefacts(
    version: str,
    artefact_dir: Path,
) -> tuple[
    dict[int, dict[float, Any]],
    dict[int, StandardScaler],
    dict[int, float],
    dict[str, Any],
]:
    """Load artefacts from a versioned folder.

    Returns
    -------
    (models_by_horizon, scalers_by_horizon, offsets_by_horizon, metadata)
    """
    version_dir = artefact_dir / version
    if not version_dir.exists():
        raise FileNotFoundError(f"Artefact version not found: {version_dir}")

    models = joblib.load(version_dir / "models.joblib")
    scalers = joblib.load(version_dir / "scalers.joblib")
    calibration = joblib.load(version_dir / "calibration.joblib")
    with open(version_dir / "metadata.json", encoding="utf-8") as fh:
        meta = json.load(fh)

    return models, scalers, calibration, meta


def list_versions(artefact_dir: Path | None = None) -> list[str]:
    """Return all saved version tags in newest-first order."""
    if artefact_dir is None:
        artefact_dir = _DEFAULT_ARTEFACT_DIR
    if not artefact_dir.exists():
        return []
    versions = sorted(
        (d.name for d in artefact_dir.iterdir() if d.is_dir()),
        reverse=True,
    )
    return versions


def latest_version(artefact_dir: Path | None = None) -> str | None:
    """Return the latest version tag, or None if no versions exist."""
    if artefact_dir is None:
        artefact_dir = _DEFAULT_ARTEFACT_DIR
    vs = list_versions(artefact_dir)
    return vs[0] if vs else None


# ---------------------------------------------------------------------------
# Model registry helper (writes a JSON index; DB write done separately)
# ---------------------------------------------------------------------------


def _upsert_registry_json(
    version: str,
    artefact_dir: Path,
    metrics: dict[int, HorizonMetrics],
    feature_names: list[str],
    extra_meta: dict[str, Any],
) -> None:
    """Maintain a flat ``registry.json`` index next to the artefact dir.

    This file acts as a lightweight model registry that the API layer can
    query without a DB round-trip.  A proper ``model_registry`` table write
    is the responsibility of the orchestration layer (e.g. ``retrain_job.py``)
    which has a DB session.
    """
    registry_path = artefact_dir / "registry.json"
    registry: list[dict[str, Any]] = []
    if registry_path.exists():
        with open(registry_path, encoding="utf-8") as fh:
            registry = json.load(fh)

    entry: dict[str, Any] = {
        "version": version,
        "created_at_utc": datetime.now(tz=timezone.utc).isoformat(),
        "backend": extra_meta.get("backend", "xgboost"),
        "n_features": len(feature_names),
        "horizons": {
            str(h): {
                "model_mae": m.model_mae,
                "baseline_mae": m.baseline_mae,
                "direction_accuracy": m.direction_accuracy,
                "dir_acc_ci_lower": m.dir_acc_ci_lower,
                "dir_acc_ci_upper": m.dir_acc_ci_upper,
                "empirical_coverage_90": m.empirical_coverage_90,
                "cqr_offset": m.cqr_offset,
                "has_edge": m.has_edge,
            }
            for h, m in metrics.items()
        },
        **{k: v for k, v in extra_meta.items() if k not in ("backend",)},
    }

    # Replace existing entry for the same version, else prepend.
    registry = [e for e in registry if e.get("version") != version]
    registry.insert(0, entry)

    with open(registry_path, "w", encoding="utf-8") as fh:
        json.dump(registry, fh, indent=2)


# ---------------------------------------------------------------------------
# Data block splitting
# ---------------------------------------------------------------------------


def _split_blocks(
    X: pd.DataFrame,
    y: pd.DataFrame,
    train_frac: float = _TRAIN_FRAC,
    calib_frac: float = _CALIB_FRAC,
) -> tuple[
    pd.DataFrame, pd.DataFrame,   # X_train, y_train
    pd.DataFrame, pd.DataFrame,   # X_calib, y_calib
    pd.DataFrame, pd.DataFrame,   # X_test,  y_test
]:
    """Split (X, y) into three contiguous, time-ordered blocks.

    Splitting is by *row count* (not by date) so the fractions are exact.
    """
    n = len(X)
    n_train = int(n * train_frac)
    n_calib = int(n * calib_frac)

    X_train = X.iloc[:n_train]
    y_train = y.iloc[:n_train]
    X_calib = X.iloc[n_train : n_train + n_calib]
    y_calib = y.iloc[n_train : n_train + n_calib]
    X_test = X.iloc[n_train + n_calib :]
    y_test = y.iloc[n_train + n_calib :]

    return X_train, y_train, X_calib, y_calib, X_test, y_test


# ---------------------------------------------------------------------------
# Main training function
# ---------------------------------------------------------------------------


def train(
    merged_df: pd.DataFrame,
    cfg: TrainConfig | None = None,
) -> TrainResult:
    """Train, calibrate, evaluate and persist models from a merged DataFrame.

    Parameters
    ----------
    merged_df:
        The merged DataFrame from the ingestion layer — same contract as
        ``app.features.engineer.engineer_features``.
    cfg:
        Training configuration.  Defaults to ``TrainConfig()``.

    Returns
    -------
    TrainResult
        Contains versioned artefact path, per-horizon metrics and metadata.
    """
    from app.features.engineer import engineer_features  # avoid circular import

    if cfg is None:
        cfg = TrainConfig()

    logger.info("=== TradeShield training run (%s backend) ===", cfg.backend)
    rng = np.random.default_rng(seed=cfg.random_state)

    # ── 1. Feature engineering ─────────────────────────────────────────────
    logger.info("Running feature engineering …")
    eng = engineer_features(merged_df)

    X_all = eng.X_train_ready          # rows with at least one valid target
    y_all = eng.y_train_ready
    feature_names = eng.feature_names

    if len(X_all) < 100:
        raise ValueError(
            f"Only {len(X_all)} usable rows after feature engineering. "
            "Need at least 100 for a meaningful train/calib/test split."
        )

    # ── 2. Three-way block split ───────────────────────────────────────────
    X_tr, y_tr, X_cal, y_cal, X_te, y_te = _split_blocks(X_all, y_all)
    logger.info(
        "Block sizes — train: %d  calib: %d  test: %d",
        len(X_tr), len(X_cal), len(X_te),
    )

    train_end_date = str(X_tr.index[-1].date())
    calib_end_date = str(X_cal.index[-1].date())
    test_end_date  = str(X_te.index[-1].date())

    # ── 3. Per-horizon training ────────────────────────────────────────────
    all_models:  dict[int, dict[float, Any]] = {}
    all_scalers: dict[int, StandardScaler]   = {}
    all_offsets: dict[int, float]            = {}
    all_metrics: dict[int, HorizonMetrics]   = {}

    target_cols = [f"target_fwd_{h}d" for h in TARGET_HORIZONS]

    for h in TARGET_HORIZONS:
        col = f"target_fwd_{h}d"
        logger.info("─── Horizon h=%dd ───", h)

        # Valid mask per horizon (some early rows may have NaN target for h>1).
        tr_mask = y_tr[col].notna()
        cal_mask = y_cal[col].notna()
        te_mask  = y_te[col].notna()

        if tr_mask.sum() < 50:
            logger.warning("h=%dd: too few training samples (%d), skipping.", h, tr_mask.sum())
            continue

        y_tr_h  = y_tr.loc[tr_mask,  col].to_numpy(dtype=float)
        y_cal_h = y_cal.loc[cal_mask, col].to_numpy(dtype=float)
        y_te_h  = y_te.loc[te_mask,  col].to_numpy(dtype=float)

        # ── Fit scaler on train fold only ──────────────────────────────────
        scaler = StandardScaler()
        X_tr_h  = scaler.fit_transform(X_tr.loc[tr_mask].to_numpy(dtype=float))
        X_cal_h = scaler.transform(X_cal.loc[cal_mask].to_numpy(dtype=float))
        X_te_h  = scaler.transform(X_te.loc[te_mask].to_numpy(dtype=float))

        models_h, offset_h, metrics_h = _train_one_horizon(
            h=h,
            X_train=X_tr_h,
            y_train=y_tr_h,
            X_calib=X_cal_h,
            y_calib=y_cal_h,
            X_test=X_te_h,
            y_test=y_te_h,
            cfg=cfg,
            rng=rng,
        )

        all_models[h]  = models_h
        all_scalers[h] = scaler
        all_offsets[h] = offset_h
        all_metrics[h] = metrics_h

        logger.info(metrics_h)

    # ── 4. Persist artefacts ───────────────────────────────────────────────
    version = _version_tag()
    extra_meta = {
        "backend": cfg.backend,
        "train_end_date": train_end_date,
        "calib_end_date": calib_end_date,
        "test_end_date": test_end_date,
        "n_train": len(X_tr),
        "n_calib": len(X_cal),
        "n_test": len(X_te),
        "dropped_features": eng.dropped_features,
        "missing_macro": eng.missing_macro,
    }

    artefact_path = _save_artefacts(
        version=version,
        models_by_horizon=all_models,
        scalers_by_horizon=all_scalers,
        offsets_by_horizon=all_offsets,
        feature_names=feature_names,
        metrics=all_metrics,
        cfg=cfg,
        extra_meta=extra_meta,
        artefact_dir=cfg.artefact_dir,
    )

    _upsert_registry_json(
        version=version,
        artefact_dir=cfg.artefact_dir,
        metrics=all_metrics,
        feature_names=feature_names,
        extra_meta=extra_meta,
    )

    result = TrainResult(
        version=version,
        metrics=all_metrics,
        feature_names=feature_names,
        artefact_path=artefact_path,
        config=cfg,
        train_end_date=train_end_date,
        calib_end_date=calib_end_date,
        test_end_date=test_end_date,
        n_train=len(X_tr),
        n_calib=len(X_cal),
        n_test=len(X_te),
    )

    logger.info("\n%s", result.summary())
    return result


# ---------------------------------------------------------------------------
# retrain() — the callable that orchestration layers invoke
# ---------------------------------------------------------------------------


def retrain(
    cfg: TrainConfig | None = None,
    data_fetcher: Any | None = None,
) -> TrainResult:
    """Pull fresh data, train all models, calibrate, evaluate and persist.

    This function **never reads old artefact files** — it always starts from
    raw data.  The ``data_fetcher`` parameter exists for testing: pass a
    callable ``() -> pd.DataFrame`` to substitute the DB pull.

    Parameters
    ----------
    cfg:
        Training configuration.  Defaults to ``TrainConfig()``.
    data_fetcher:
        Optional callable that returns the merged DataFrame.  When ``None``
        (production), data is pulled from the repository layer.  Pass a
        synthetic generator in tests to avoid DB access.

    Returns
    -------
    TrainResult
    """
    if cfg is None:
        cfg = TrainConfig()

    logger.info("retrain() called — fetching fresh data …")

    if data_fetcher is not None:
        merged_df = data_fetcher()
    else:
        merged_df = _fetch_from_repository()

    return train(merged_df, cfg=cfg)


def _fetch_from_repository() -> pd.DataFrame:
    """Stub: pull the full FX + macro history from the DB.

    In production this will call FxRepository and MacroRepository and join
    their results.  Until the repository layer is implemented, raises
    ``NotImplementedError`` so the orchestration job fails clearly instead
    of silently returning stale data.
    """
    raise NotImplementedError(
        "DB repository not yet wired. Pass `data_fetcher` to retrain() or "
        "call train(merged_df) directly with a pre-loaded DataFrame."
    )


# ---------------------------------------------------------------------------
# Convenience: load a saved version back into Python objects
# ---------------------------------------------------------------------------


def load(
    version: str | None = None,
    artefact_dir: Path = _DEFAULT_ARTEFACT_DIR,
) -> tuple[dict[int, dict[float, Any]], dict[int, StandardScaler], dict[int, float], dict[str, Any]]:
    """Load a saved training artefact.

    Parameters
    ----------
    version:
        Version tag to load.  Defaults to the latest.
    artefact_dir:
        Root artefact directory.

    Returns
    -------
    (models_by_horizon, scalers_by_horizon, offsets_by_horizon, metadata)
    """
    if version is None:
        version = latest_version(artefact_dir)
    if version is None:
        raise FileNotFoundError(f"No artefacts found in {artefact_dir}")
    return _load_artefacts(version, artefact_dir)
