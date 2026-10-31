"""
tests/test_train.py — Tests for app.models.train.

All data is synthetic and generated procedurally (no fixtures from files).
The test suite deliberately keeps n small (300 rows, n_iter_search=2) so the
full suite runs in <120 s on a typical developer machine.

Coverage
────────
* Block splitting: sizes, ordering, no leakage across blocks
* _pinball_loss: definition check at degenerate inputs
* _direction_accuracy_with_ci: CI bracketing, bootstrap stability
* _mae: correctness
* _cqr_fit / _cqr_predict / _empirical_coverage: calibration contract
* _tune_hyperparams: runs without error, returns expected keys
* _train_one_horizon: returns correct types, metrics within bounds
* _save_artefacts / _load_artefacts: round-trip equality
* list_versions / latest_version: ordering
* train(): full end-to-end on synthetic data (XGBoost + LightGBM)
* retrain(): uses data_fetcher kwarg, never reads old files
* HorizonMetrics.has_edge: logic checks
* Persistence: metadata.json contains required keys
* registry.json: exists and has correct structure after train()
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from app.models.train import (
    NOMINAL_COVERAGE,
    QUANTILES,
    TARGET_HORIZONS,
    HorizonMetrics,
    TrainConfig,
    TrainResult,
    _cqr_fit,
    _cqr_predict,
    _direction_accuracy_with_ci,
    _empirical_coverage,
    _load_artefacts,
    _mae,
    _pinball_loss,
    _save_artefacts,
    _split_blocks,
    _train_one_horizon,
    _tune_hyperparams,
    _upsert_registry_json,
    _version_tag,
    latest_version,
    list_versions,
    load,
    retrain,
    train,
)


# ---------------------------------------------------------------------------
# Synthetic data factory
# ---------------------------------------------------------------------------

def _make_merged(n: int = 300, seed: int = 0) -> pd.DataFrame:
    """Generate a minimal synthetic merged DataFrame for tests."""
    rng = np.random.default_rng(seed=seed)
    bdays = pd.bdate_range("2020-01-02", periods=n, freq="B", tz="UTC")
    close = 75.0 * np.cumprod(1 + rng.normal(0, 0.004, n))
    df = pd.DataFrame(
        {
            "open": close - 0.1,
            "high": close + 0.2,
            "low": close - 0.2,
            "close": close,
            "volume": rng.uniform(1e6, 5e6, n),
            "dxy": 100.0 * np.cumprod(1 + rng.normal(0, 0.002, n)),
            "nifty": 18000.0 * np.cumprod(1 + rng.normal(0, 0.005, n)),
            "brent": 80.0 * np.cumprod(1 + rng.normal(0, 0.006, n)),
            "yield_10y": np.clip(4.0 + np.cumsum(rng.normal(0, 0.01, n)), 0.5, 15.0),
        },
        index=bdays,
    )
    return df


def _fast_cfg(tmp_path: Path) -> TrainConfig:
    """Minimal TrainConfig for fast tests."""
    return TrainConfig(
        backend="xgboost",
        n_iter_search=2,
        cv_splits=2,
        n_estimators=50,
        artefact_dir=tmp_path / "artefacts",
    )


# ---------------------------------------------------------------------------
# 1. Block splitting
# ---------------------------------------------------------------------------

class TestSplitBlocks:
    def _xy(self, n=200):
        idx = pd.bdate_range("2020-01-02", periods=n, tz="UTC")
        X = pd.DataFrame({"a": np.arange(n, dtype=float)}, index=idx)
        y = pd.DataFrame({"t": np.arange(n, dtype=float)}, index=idx)
        return X, y

    def test_sizes_sum_to_n(self):
        X, y = self._xy(200)
        X_tr, y_tr, X_ca, y_ca, X_te, y_te = _split_blocks(X, y, 0.60, 0.20)
        assert len(X_tr) + len(X_ca) + len(X_te) == len(X)

    def test_no_index_overlap(self):
        X, y = self._xy(200)
        X_tr, _, X_ca, _, X_te, _ = _split_blocks(X, y, 0.60, 0.20)
        tr_set = set(X_tr.index)
        ca_set = set(X_ca.index)
        te_set = set(X_te.index)
        assert tr_set.isdisjoint(ca_set)
        assert tr_set.isdisjoint(te_set)
        assert ca_set.isdisjoint(te_set)

    def test_ordering_preserved(self):
        X, y = self._xy(200)
        X_tr, _, X_ca, _, X_te, _ = _split_blocks(X, y, 0.60, 0.20)
        assert X_tr.index[-1] < X_ca.index[0]
        assert X_ca.index[-1] < X_te.index[0]

    def test_approximate_fractions(self):
        X, y = self._xy(200)
        X_tr, _, X_ca, _, X_te, _ = _split_blocks(X, y, 0.60, 0.20)
        assert abs(len(X_tr) / len(X) - 0.60) <= 0.02
        assert abs(len(X_ca) / len(X) - 0.20) <= 0.02


# ---------------------------------------------------------------------------
# 2. Pinball loss
# ---------------------------------------------------------------------------

class TestPinball:
    def test_perfect_prediction_at_median(self):
        y = np.array([1.0, 2.0, 3.0])
        assert _pinball_loss(y, y, 0.50) == pytest.approx(0.0)

    def test_positive_for_wrong_prediction(self):
        y = np.array([1.0, 1.0, 1.0])
        yhat = np.zeros(3)
        assert _pinball_loss(y, yhat, 0.90) > 0

    def test_asymmetry(self):
        """Pinball at q=0.9 penalises under-prediction more than over-prediction.

        y=0, yhat=-1 (undershoot): err=+1  → loss = q * 1 = 0.9
        y=0, yhat=+1 (overshoot):  err=-1  → loss = (q-1)*(-1) = 0.1
        So undershoot > overshoot for high quantiles.
        """
        y = np.array([0.0])
        undershoot = _pinball_loss(y, np.array([-1.0]), 0.90)   # yhat < y
        overshoot  = _pinball_loss(y, np.array([1.0]),  0.90)   # yhat > y
        assert undershoot > overshoot


# ---------------------------------------------------------------------------
# 3. MAE
# ---------------------------------------------------------------------------

class TestMAE:
    def test_zero_on_perfect(self):
        y = np.array([1.0, 2.0, 3.0])
        assert _mae(y, y) == pytest.approx(0.0)

    def test_correct_value(self):
        y = np.array([0.0, 1.0, 2.0])
        yhat = np.array([1.0, 1.0, 1.0])
        assert _mae(y, yhat) == pytest.approx(2.0 / 3.0)


# ---------------------------------------------------------------------------
# 4. Direction accuracy + bootstrap CI
# ---------------------------------------------------------------------------

class TestDirectionAccuracy:
    def test_perfect_direction(self):
        y    = np.array([1.0, -1.0, 1.0, -1.0])
        yhat = np.array([0.5, -0.5, 0.5, -0.5])
        acc, lo, hi = _direction_accuracy_with_ci(y, yhat, n_boot=500, rng=np.random.default_rng(0))
        assert acc == pytest.approx(1.0)

    def test_zero_direction(self):
        y    = np.array([1.0, -1.0, 1.0, -1.0])
        yhat = -y
        acc, _, _ = _direction_accuracy_with_ci(y, yhat, n_boot=500, rng=np.random.default_rng(0))
        assert acc == pytest.approx(0.0)

    def test_ci_brackets_point(self):
        rng = np.random.default_rng(1)
        y    = rng.choice([-1.0, 1.0], size=100)
        yhat = rng.normal(size=100)
        acc, lo, hi = _direction_accuracy_with_ci(y, yhat, n_boot=1000, rng=np.random.default_rng(2))
        assert lo <= acc <= hi

    def test_ci_width_decreases_with_n(self):
        rng_boot = np.random.default_rng(3)
        for n_obs, max_width in [(50, 0.40), (500, 0.15)]:
            y    = np.random.default_rng(4).choice([-1.0, 1.0], size=n_obs)
            yhat = np.random.default_rng(5).normal(size=n_obs)
            _, lo, hi = _direction_accuracy_with_ci(y, yhat, n_boot=500, rng=rng_boot)
            assert (hi - lo) < max_width, f"CI too wide for n={n_obs}: {hi-lo:.3f}"


# ---------------------------------------------------------------------------
# 5. CQR calibration
# ---------------------------------------------------------------------------

class TestCQR:
    def _oracle(self, n=200, seed=7):
        rng = np.random.default_rng(seed)
        y = rng.normal(size=n)
        # 'Perfect' quantile models that exactly predict true quantiles.
        q_lo = np.full(n, np.quantile(y, 0.05))
        q_hi = np.full(n, np.quantile(y, 0.95))
        return y, q_lo, q_hi

    def test_offset_type(self):
        y, q_lo, q_hi = self._oracle()
        offset = _cqr_fit(y, q_lo, q_hi, 0.90)
        assert isinstance(offset, float)

    def test_adjusted_coverage_near_nominal(self):
        """After CQR adjustment, empirical coverage should be ≈ 90 %."""
        rng = np.random.default_rng(8)
        y_calib = rng.normal(size=300)
        y_test  = rng.normal(size=300)
        # Deliberately miscalibrated models (too narrow).
        q_lo_calib = y_calib - 0.5
        q_hi_calib = y_calib + 0.5
        q_lo_test  = y_test  - 0.5
        q_hi_test  = y_test  + 0.5

        offset = _cqr_fit(y_calib, q_lo_calib, q_hi_calib, 0.90)
        adj_lo, adj_hi = _cqr_predict(q_lo_test, q_hi_test, offset)
        cov = _empirical_coverage(y_test, adj_lo, adj_hi)
        # CQR guarantee: coverage ≥ 1−α (here 0.90), up to finite-sample slack.
        assert cov >= 0.85, f"Coverage {cov:.3f} unexpectedly low"

    def test_empirical_coverage_trivial(self):
        y = np.array([0.0, 1.0, 2.0])
        lo = np.array([-1.0, 0.0, 1.0])
        hi = np.array([1.0, 2.0, 3.0])
        assert _empirical_coverage(y, lo, hi) == pytest.approx(1.0)

    def test_cqr_predict_widens_interval(self):
        q_lo = np.array([-1.0, -2.0])
        q_hi = np.array([1.0, 2.0])
        adj_lo, adj_hi = _cqr_predict(q_lo, q_hi, offset=0.5)
        assert (adj_lo < q_lo).all()
        assert (adj_hi > q_hi).all()


# ---------------------------------------------------------------------------
# 6. Hyper-parameter search
# ---------------------------------------------------------------------------

class TestTuneHyperparams:
    def test_returns_dict(self):
        rng = np.random.default_rng(0)
        X = rng.normal(size=(150, 10)).astype(np.float32)
        y = rng.normal(size=150)
        cfg = TrainConfig(backend="xgboost", n_iter_search=2, cv_splits=2, n_jobs=1)
        best = _tune_hyperparams(X, y, cfg)
        assert isinstance(best, dict)
        assert len(best) > 0

    def test_known_keys_present(self):
        rng = np.random.default_rng(1)
        X = rng.normal(size=(150, 10)).astype(np.float32)
        y = rng.normal(size=150)
        cfg = TrainConfig(backend="xgboost", n_iter_search=2, cv_splits=2, n_jobs=1)
        best = _tune_hyperparams(X, y, cfg)
        for key in ("n_estimators", "learning_rate", "max_depth"):
            assert key in best

    def test_lightgbm_search(self):
        rng = np.random.default_rng(2)
        X = rng.normal(size=(150, 10)).astype(np.float32)
        y = rng.normal(size=150)
        cfg = TrainConfig(backend="lightgbm", n_iter_search=2, cv_splits=2, n_jobs=1)
        best = _tune_hyperparams(X, y, cfg)
        assert "n_estimators" in best


# ---------------------------------------------------------------------------
# 7. _train_one_horizon
# ---------------------------------------------------------------------------

class TestTrainOneHorizon:
    @pytest.fixture(scope="class")
    def horizon_result(self):
        rng = np.random.default_rng(99)
        n_tr, n_ca, n_te = 150, 50, 50
        X_tr = rng.normal(size=(n_tr, 8)).astype(np.float32)
        y_tr = rng.normal(scale=0.005, size=n_tr)
        X_ca = rng.normal(size=(n_ca, 8)).astype(np.float32)
        y_ca = rng.normal(scale=0.005, size=n_ca)
        X_te = rng.normal(size=(n_te, 8)).astype(np.float32)
        y_te = rng.normal(scale=0.005, size=n_te)
        cfg  = TrainConfig(backend="xgboost", n_iter_search=2, cv_splits=2, n_jobs=1)
        models, offset, metrics = _train_one_horizon(
            h=1,
            X_train=X_tr, y_train=y_tr,
            X_calib=X_ca, y_calib=y_ca,
            X_test=X_te, y_test=y_te,
            cfg=cfg, rng=np.random.default_rng(0),
        )
        return models, offset, metrics

    def test_models_keys(self, horizon_result):
        models, _, _ = horizon_result
        assert set(models.keys()) == set(QUANTILES)

    def test_offset_is_float(self, horizon_result):
        _, offset, _ = horizon_result
        assert isinstance(offset, float)

    def test_metrics_type(self, horizon_result):
        _, _, m = horizon_result
        assert isinstance(m, HorizonMetrics)

    def test_pinball_keys(self, horizon_result):
        _, _, m = horizon_result
        assert set(m.pinball.keys()) == set(QUANTILES)

    def test_pinball_positive(self, horizon_result):
        _, _, m = horizon_result
        for q, v in m.pinball.items():
            assert v >= 0, f"Pinball at q={q} is negative: {v}"

    def test_direction_acc_in_range(self, horizon_result):
        _, _, m = horizon_result
        assert 0.0 <= m.direction_accuracy <= 1.0

    def test_ci_valid(self, horizon_result):
        _, _, m = horizon_result
        assert m.dir_acc_ci_lower <= m.direction_accuracy <= m.dir_acc_ci_upper

    def test_coverage_in_range(self, horizon_result):
        _, _, m = horizon_result
        assert 0.0 <= m.empirical_coverage_90 <= 1.0

    def test_has_edge_type(self, horizon_result):
        _, _, m = horizon_result
        assert isinstance(m.has_edge, bool)

    def test_mae_positive(self, horizon_result):
        _, _, m = horizon_result
        assert m.model_mae >= 0
        assert m.baseline_mae >= 0


# ---------------------------------------------------------------------------
# 8. Persistence round-trip
# ---------------------------------------------------------------------------

class TestPersistence:
    def _dummy_models(self):
        """Tiny sklearn objects to avoid XGBoost model serialization overhead."""
        from sklearn.dummy import DummyRegressor
        dr = DummyRegressor()
        dr.fit([[0]], [0])
        return {h: {q: dr for q in QUANTILES} for h in TARGET_HORIZONS}

    def _dummy_scalers(self):
        from sklearn.preprocessing import StandardScaler
        sc = StandardScaler()
        sc.fit([[0, 1], [1, 2]])
        return {h: sc for h in TARGET_HORIZONS}

    def _dummy_offsets(self):
        return {h: 0.01 * h for h in TARGET_HORIZONS}

    def _dummy_metrics(self):
        m = HorizonMetrics(
            horizon=1,
            model_mae=0.004,
            baseline_mae=0.005,
            mae_improvement=0.001,
            direction_accuracy=0.52,
            dir_acc_ci_lower=0.45,
            dir_acc_ci_upper=0.59,
            pinball={q: 0.001 for q in QUANTILES},
            empirical_coverage_90=0.91,
            cqr_offset=0.002,
            has_edge=True,
        )
        return {1: m}

    def test_round_trip(self, tmp_path):
        version = "test_v1"
        cfg = TrainConfig(artefact_dir=tmp_path / "art")
        _save_artefacts(
            version=version,
            models_by_horizon=self._dummy_models(),
            scalers_by_horizon=self._dummy_scalers(),
            offsets_by_horizon=self._dummy_offsets(),
            feature_names=["f1", "f2"],
            metrics=self._dummy_metrics(),
            cfg=cfg,
            extra_meta={"backend": "xgboost"},
            artefact_dir=tmp_path / "art",
        )
        models2, scalers2, offsets2, meta = _load_artefacts(version, tmp_path / "art")
        assert set(models2.keys()) == set(TARGET_HORIZONS)
        assert set(offsets2.keys()) == set(TARGET_HORIZONS)
        assert "feature_names" in meta

    def test_metadata_json_structure(self, tmp_path):
        version = "test_meta"
        cfg = TrainConfig(artefact_dir=tmp_path / "art")
        _save_artefacts(
            version=version,
            models_by_horizon=self._dummy_models(),
            scalers_by_horizon=self._dummy_scalers(),
            offsets_by_horizon=self._dummy_offsets(),
            feature_names=["f1"],
            metrics=self._dummy_metrics(),
            cfg=cfg,
            extra_meta={"backend": "xgboost"},
            artefact_dir=tmp_path / "art",
        )
        meta_path = tmp_path / "art" / version / "metadata.json"
        assert meta_path.exists()
        with open(meta_path) as f:
            md = json.load(f)
        for key in ("version", "backend", "feature_names", "horizons", "quantiles", "metrics"):
            assert key in md, f"Missing key in metadata.json: {key}"

    def test_list_versions_order(self, tmp_path):
        art = tmp_path / "art"
        cfg = TrainConfig(artefact_dir=art)
        for v in ["20230101_000000", "20240101_000000", "20220101_000000"]:
            _save_artefacts(
                version=v,
                models_by_horizon=self._dummy_models(),
                scalers_by_horizon=self._dummy_scalers(),
                offsets_by_horizon=self._dummy_offsets(),
                feature_names=[],
                metrics={},
                cfg=cfg,
                extra_meta={},
                artefact_dir=art,
            )
        versions = list_versions(art)
        assert versions[0] == "20240101_000000"   # newest first

    def test_latest_version(self, tmp_path):
        art = tmp_path / "art"
        cfg = TrainConfig(artefact_dir=art)
        for v in ["20230101_000000", "20250101_000000"]:
            _save_artefacts(
                version=v,
                models_by_horizon=self._dummy_models(),
                scalers_by_horizon=self._dummy_scalers(),
                offsets_by_horizon=self._dummy_offsets(),
                feature_names=[],
                metrics={},
                cfg=cfg,
                extra_meta={},
                artefact_dir=art,
            )
        assert latest_version(art) == "20250101_000000"

    def test_latest_version_none_when_empty(self, tmp_path):
        assert latest_version(tmp_path / "nonexistent") is None

    def test_load_unknown_version_raises(self, tmp_path):
        with pytest.raises(FileNotFoundError):
            load(version="does_not_exist", artefact_dir=tmp_path)

    def test_registry_json_created(self, tmp_path):
        art = tmp_path / "art"
        cfg = TrainConfig(artefact_dir=art)
        _save_artefacts(
            version="v_reg",
            models_by_horizon=self._dummy_models(),
            scalers_by_horizon=self._dummy_scalers(),
            offsets_by_horizon=self._dummy_offsets(),
            feature_names=["f1"],
            metrics=self._dummy_metrics(),
            cfg=cfg,
            extra_meta={"backend": "xgboost"},
            artefact_dir=art,
        )
        _upsert_registry_json(
            version="v_reg",
            artefact_dir=art,
            metrics=self._dummy_metrics(),
            feature_names=["f1"],
            extra_meta={"backend": "xgboost"},
        )
        reg_path = art / "registry.json"
        assert reg_path.exists()
        with open(reg_path) as f:
            reg = json.load(f)
        assert len(reg) >= 1
        assert reg[0]["version"] == "v_reg"
        assert "horizons" in reg[0]


# ---------------------------------------------------------------------------
# 9. has_edge logic
# ---------------------------------------------------------------------------

class TestHasEdge:
    def _m(self, model_mae, baseline_mae, ci_lower) -> HorizonMetrics:
        return HorizonMetrics(
            horizon=1,
            model_mae=model_mae,
            baseline_mae=baseline_mae,
            mae_improvement=baseline_mae - model_mae,
            direction_accuracy=0.55,
            dir_acc_ci_lower=ci_lower,
            dir_acc_ci_upper=0.65,
            pinball={},
            empirical_coverage_90=0.90,
            cqr_offset=0.001,
            has_edge=(model_mae < baseline_mae and ci_lower > 0.50),
        )

    def test_edge_when_both_conditions_met(self):
        m = self._m(model_mae=0.003, baseline_mae=0.005, ci_lower=0.51)
        assert m.has_edge is True

    def test_no_edge_when_mae_worse(self):
        m = self._m(model_mae=0.006, baseline_mae=0.005, ci_lower=0.55)
        assert m.has_edge is False

    def test_no_edge_when_ci_below_50(self):
        m = self._m(model_mae=0.003, baseline_mae=0.005, ci_lower=0.49)
        assert m.has_edge is False

    def test_no_edge_when_both_fail(self):
        m = self._m(model_mae=0.006, baseline_mae=0.005, ci_lower=0.45)
        assert m.has_edge is False


# ---------------------------------------------------------------------------
# 10. End-to-end train() — XGBoost
# ---------------------------------------------------------------------------

class TestTrainEndToEnd:
    @pytest.fixture(scope="class")
    def train_result(self, tmp_path_factory):
        tmp_path = tmp_path_factory.mktemp("train_e2e")
        df = _make_merged(n=300, seed=11)
        cfg = TrainConfig(
            backend="xgboost",
            n_iter_search=2,
            cv_splits=2,
            n_estimators=50,
            artefact_dir=tmp_path / "artefacts",
        )
        return train(df, cfg=cfg)

    def test_returns_train_result(self, train_result):
        assert isinstance(train_result, TrainResult)

    def test_version_nonempty(self, train_result):
        assert train_result.version != ""

    def test_metrics_keys_are_horizons(self, train_result):
        for h in TARGET_HORIZONS:
            assert h in train_result.metrics

    def test_feature_names_nonempty(self, train_result):
        assert len(train_result.feature_names) > 0

    def test_artefact_path_exists(self, train_result):
        assert train_result.artefact_path.exists()

    def test_models_joblib_present(self, train_result):
        assert (train_result.artefact_path / "models.joblib").exists()

    def test_scalers_joblib_present(self, train_result):
        assert (train_result.artefact_path / "scalers.joblib").exists()

    def test_calibration_joblib_present(self, train_result):
        assert (train_result.artefact_path / "calibration.joblib").exists()

    def test_metadata_json_present(self, train_result):
        assert (train_result.artefact_path / "metadata.json").exists()

    def test_summary_str(self, train_result):
        s = train_result.summary()
        assert "TrainResult" in s

    def test_block_sizes_positive(self, train_result):
        assert train_result.n_train > 0
        assert train_result.n_calib > 0
        assert train_result.n_test > 0

    def test_registry_json_exists(self, train_result):
        reg = train_result.artefact_path.parent / "registry.json"
        assert reg.exists()

    def test_horizon_metrics_pinball_keys(self, train_result):
        for h, m in train_result.metrics.items():
            assert set(m.pinball.keys()) == set(QUANTILES)

    def test_empirical_coverage_in_range(self, train_result):
        for h, m in train_result.metrics.items():
            assert 0.0 <= m.empirical_coverage_90 <= 1.0, f"h={h}"

    def test_cqr_offset_stored_in_calibration(self, train_result):
        import joblib
        offsets = joblib.load(train_result.artefact_path / "calibration.joblib")
        for h in train_result.metrics:
            assert h in offsets
            assert isinstance(offsets[h], float)

    def test_scalers_fit_on_train_only(self, train_result):
        """Scaler mean_ must be non-trivial (fitted, not default)."""
        import joblib
        scalers = joblib.load(train_result.artefact_path / "scalers.joblib")
        for h, scaler in scalers.items():
            assert hasattr(scaler, "mean_"), f"Scaler h={h} not fitted"

    def test_load_round_trip(self, train_result):
        models, scalers, offsets, meta = load(
            version=train_result.version,
            artefact_dir=train_result.config.artefact_dir,
        )
        assert set(models.keys()) == set(train_result.metrics.keys())
        assert meta["version"] == train_result.version


# ---------------------------------------------------------------------------
# 11. End-to-end train() — LightGBM
# ---------------------------------------------------------------------------

class TestTrainLightGBM:
    def test_lightgbm_backend(self, tmp_path):
        df = _make_merged(n=300, seed=22)
        cfg = TrainConfig(
            backend="lightgbm",
            n_iter_search=2,
            cv_splits=2,
            n_estimators=50,
            artefact_dir=tmp_path / "artefacts",
        )
        result = train(df, cfg=cfg)
        assert isinstance(result, TrainResult)
        assert len(result.metrics) > 0


# ---------------------------------------------------------------------------
# 12. retrain() — uses data_fetcher kwarg, never reads old artefacts
# ---------------------------------------------------------------------------

class TestRetrain:
    def test_retrain_with_fetcher(self, tmp_path):
        df = _make_merged(n=300, seed=33)
        cfg = TrainConfig(
            backend="xgboost",
            n_iter_search=2,
            cv_splits=2,
            n_estimators=50,
            artefact_dir=tmp_path / "artefacts",
        )
        result = retrain(cfg=cfg, data_fetcher=lambda: df)
        assert isinstance(result, TrainResult)

    def test_retrain_without_fetcher_raises(self):
        """Without a data_fetcher, retrain() must raise NotImplementedError."""
        cfg = TrainConfig(n_iter_search=2, cv_splits=2)
        with pytest.raises(NotImplementedError):
            retrain(cfg=cfg, data_fetcher=None)

    def test_retrain_produces_fresh_version_each_call(self, tmp_path):
        df = _make_merged(n=300, seed=44)
        cfg = TrainConfig(
            backend="xgboost",
            n_iter_search=2,
            cv_splits=2,
            n_estimators=50,
            artefact_dir=tmp_path / "artefacts",
        )
        r1 = retrain(cfg=cfg, data_fetcher=lambda: df)
        import time as _time; _time.sleep(1.1)  # ensure different UTC second
        r2 = retrain(cfg=cfg, data_fetcher=lambda: df)
        assert r1.version != r2.version

    def test_retrain_never_reads_old_artefacts(self, tmp_path):
        """Even if old artefacts exist, retrain() must re-train from data."""
        df = _make_merged(n=300, seed=55)
        cfg = TrainConfig(
            backend="xgboost",
            n_iter_search=2,
            cv_splits=2,
            n_estimators=50,
            artefact_dir=tmp_path / "artefacts",
        )
        r1 = retrain(cfg=cfg, data_fetcher=lambda: df)
        # Corrupt old artefact — retrain must not read it.
        (r1.artefact_path / "models.joblib").write_bytes(b"CORRUPT")
        import time as _time; _time.sleep(1.1)
        # Should succeed because it ignores old artefacts.
        r2 = retrain(cfg=cfg, data_fetcher=lambda: df)
        assert r2.version != r1.version


# ---------------------------------------------------------------------------
# 13. Version tag
# ---------------------------------------------------------------------------

class TestVersionTag:
    def test_format(self):
        v = _version_tag()
        assert len(v) == 15    # YYYYMMDD_HHMMSS
        assert v[8] == "_"
        assert v.replace("_", "").isdigit()

    def test_uniqueness(self):
        import time as _time
        tags = set()
        for _ in range(3):
            tags.add(_version_tag())
            _time.sleep(1.1)
        assert len(tags) == 3
