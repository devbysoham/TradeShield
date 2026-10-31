"""
app/features/engineer.py — Feature engineering for the USD/INR forecast model.

Input
-----
A merged DataFrame produced by the ingestion layer.  Expected columns:

    close           : USD/INR daily close price        (required)
    open, high, low : OHLCV columns                    (optional, used nowhere below
                                                        but preserved)
    dxy             : DXY index close                  (optional macro)
    nifty           : Nifty 50 index close             (optional macro)
    brent           : Brent crude close                (optional macro)
    yield_10y       : US 10-year Treasury yield (%)    (optional macro)

All columns other than ``close`` are treated as optional: if absent the
corresponding features are silently dropped and their names are recorded in
``EngineeringResult.dropped_features``.

Feature groups built (using *only* past information)
-----------------------------------------------------
1.  Log-returns of USD/INR at 1, 5, 10, 20 days
2.  SMA / EMA at 5, 10, 20, 50 days; price distance from each (close – MA)
3.  RSI(14) — hand-rolled Wilder smoothing, no third-party TA library
4.  Rolling volatility (std of log-returns) at 5, 10, 20 days
5.  Lagged log-returns for DXY, Nifty, Brent, 10Y yield at 1, 5, 10 days
6.  Calendar: day-of-week (0=Mon … 4=Fri), month-end flag (0/1)

Targets (direct multi-horizon)
-------------------------------
For each horizon h ∈ {1, 3, 5, 10, 15} business days:

    target_fwd_{h}d = ln(close_{t+h} / close_t)

Targets are *shifted backward* so the row at date t contains the future
return.  NaN targets are dropped for training but the **latest row** is
kept for live inference (its targets are NaN by construction).

Leakage guarantee
-----------------
Every feature at time t is computed solely from prices at t and before.
The leakage test ``run_leakage_test`` verifies this for 20 random dates by
truncating the data at that date and asserting bitwise equality of features.

Usage
-----
>>> from app.features.engineer import engineer_features, run_leakage_test
>>> result = engineer_features(merged_df)
>>> run_leakage_test(merged_df)          # raises AssertionError on leakage
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

#: Horizons (business days) for the direct multi-horizon targets.
TARGET_HORIZONS: list[int] = [1, 3, 5, 10, 15]

#: Look-back windows used for log-returns of USD/INR.
RETURN_WINDOWS: list[int] = [1, 5, 10, 20]

#: Windows used for SMA / EMA.
MA_WINDOWS: list[int] = [5, 10, 20, 50]

#: Windows used for rolling volatility.
VOL_WINDOWS: list[int] = [5, 10, 20]

#: Lag depths for macro lagged returns.
MACRO_LAGS: list[int] = [1, 5, 10]

#: Macro column names expected in the merged DataFrame.
MACRO_COLS: list[str] = ["dxy", "nifty", "brent", "yield_10y"]

#: RSI look-back period (Wilder convention).
RSI_PERIOD: int = 14

#: Annualisation factor for volatility (business-day convention).
ANNUALISATION_FACTOR: float = np.sqrt(252)

#: Number of random dates to probe in the leakage test.
LEAKAGE_TEST_N: int = 20


# ---------------------------------------------------------------------------
# Result container
# ---------------------------------------------------------------------------


@dataclass
class EngineeringResult:
    """Container returned by :func:`engineer_features`."""

    #: Full feature matrix (all rows, including those with NaN targets).
    features: pd.DataFrame

    #: Multi-horizon target DataFrame (same index as ``features``).
    targets: pd.DataFrame

    #: Features ready for training (NaN targets dropped).
    X_train_ready: pd.DataFrame

    #: Targets ready for training (NaN targets dropped).
    y_train_ready: pd.DataFrame

    #: Latest row kept for live inference (may have NaN targets).
    X_live: pd.DataFrame

    #: Feature columns actually present after macro masking.
    feature_names: list[str] = field(default_factory=list)

    #: Features dropped because their source macro column was missing.
    dropped_features: list[str] = field(default_factory=list)

    #: Macro columns that were found in the input DataFrame.
    available_macro: list[str] = field(default_factory=list)

    #: Macro columns that were absent from the input DataFrame.
    missing_macro: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Low-level indicator helpers (pure-pandas / NumPy, no TA library)
# ---------------------------------------------------------------------------


def _log_returns(series: pd.Series) -> pd.Series:
    """Compute ln(P_t / P_{t-1}).  First element is NaN."""
    return np.log(series / series.shift(1))


def _sma(series: pd.Series, window: int) -> pd.Series:
    """Simple moving average.  First ``window-1`` values are NaN."""
    return series.rolling(window=window, min_periods=window).mean()


def _ema(series: pd.Series, span: int) -> pd.Series:
    """Exponential moving average using pandas ewm (adjust=False)."""
    return series.ewm(span=span, adjust=False, min_periods=span).mean()


def _rsi_wilder(series: pd.Series, period: int = 14) -> pd.Series:
    """Relative Strength Index via Wilder's smoothing (RMA).

    Implementation details
    ~~~~~~~~~~~~~~~~~~~~~~
    * Compute daily differences.
    * Separate positive (gains) and negative (losses, as positive values).
    * Seed the first Wilder average as the plain mean of the first ``period``
      gains / losses (index ``period``).
    * For each subsequent bar apply the Wilder recurrence:
        avg_gain_t = (avg_gain_{t-1} * (period - 1) + gain_t) / period
    * RSI = 100 - 100 / (1 + avg_gain / avg_loss).
    * RSI is NaN for the first ``period`` rows (no prior close to seed).
    """
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = (-delta).clip(lower=0)

    n = len(series)
    avg_gain = np.full(n, np.nan)
    avg_loss = np.full(n, np.nan)

    # Seed: plain mean of the first ``period`` increments (rows 1..period).
    # Row 0 has NaN diff, so valid diffs start at index 1.
    if n < period + 1:
        # Not enough data — return all-NaN.
        return pd.Series(np.nan, index=series.index, name="rsi")

    seed_slice = slice(1, period + 1)          # period observations
    avg_gain[period] = gain.iloc[seed_slice].mean()
    avg_loss[period] = loss.iloc[seed_slice].mean()

    # Wilder recurrence for rows period+1 .. n-1.
    alpha = (period - 1) / period
    for i in range(period + 1, n):
        avg_gain[i] = alpha * avg_gain[i - 1] + (1 - alpha) * gain.iloc[i]
        avg_loss[i] = alpha * avg_loss[i - 1] + (1 - alpha) * loss.iloc[i]

    with np.errstate(divide="ignore", invalid="ignore"):
        rs = np.where(avg_loss == 0, np.inf, avg_gain / avg_loss)
        rsi_vals = 100 - 100 / (1 + rs)

    # Rows 0..period-1 remain NaN; cap to [0, 100] for numerical safety.
    rsi_vals[:period] = np.nan
    rsi_vals = np.clip(rsi_vals, 0.0, 100.0)

    return pd.Series(rsi_vals, index=series.index, name="rsi")


def _rolling_volatility(log_ret: pd.Series, window: int) -> pd.Series:
    """Annualised rolling volatility of log-returns (std * sqrt(252))."""
    return (
        log_ret.rolling(window=window, min_periods=window).std()
        * ANNUALISATION_FACTOR
    )


def _multi_period_log_return(series: pd.Series, window: int) -> pd.Series:
    """Log-return over ``window`` periods: ln(P_t / P_{t-window})."""
    return np.log(series / series.shift(window))


def _month_end_flag(index: pd.DatetimeIndex) -> pd.Series:
    """1 on the last business day of each calendar month, else 0."""
    # A business day is month-end if the *next* business day falls in a
    # different month.
    next_bday = index.shift(1, freq="B")
    flag = (next_bday.month != index.month).astype(int)
    return pd.Series(flag, index=index, name="month_end_flag")


# ---------------------------------------------------------------------------
# Core feature builder
# ---------------------------------------------------------------------------


def _build_usdинр_features(close: pd.Series) -> pd.DataFrame:
    """Build USD/INR-specific features from the close price series.

    Returns a DataFrame with columns:
        log_ret_{w}d         — log-return over w days  (w ∈ RETURN_WINDOWS)
        sma_{w}              — simple moving average    (w ∈ MA_WINDOWS)
        ema_{w}              — exponential MA           (w ∈ MA_WINDOWS)
        dist_sma_{w}         — close − SMA              (w ∈ MA_WINDOWS)
        dist_ema_{w}         — close − EMA              (w ∈ MA_WINDOWS)
        rsi_14               — RSI with 14-period Wilder smoothing
        vol_{w}d             — rolling annualised volatility (w ∈ VOL_WINDOWS)
        day_of_week          — 0=Monday … 4=Friday
        month_end_flag       — 1 on last business day of the month
    """
    out: dict[str, pd.Series] = {}

    # ── 1. Log-returns ────────────────────────────────────────────────────
    for w in RETURN_WINDOWS:
        out[f"log_ret_{w}d"] = _multi_period_log_return(close, w)

    # ── 2. SMA / EMA and price distance ───────────────────────────────────
    for w in MA_WINDOWS:
        sma_s = _sma(close, w)
        ema_s = _ema(close, w)
        out[f"sma_{w}"] = sma_s
        out[f"ema_{w}"] = ema_s
        out[f"dist_sma_{w}"] = close - sma_s
        out[f"dist_ema_{w}"] = close - ema_s

    # ── 3. RSI(14) ────────────────────────────────────────────────────────
    out["rsi_14"] = _rsi_wilder(close, period=RSI_PERIOD)

    # ── 4. Rolling volatility ─────────────────────────────────────────────
    log_ret_1d = _multi_period_log_return(close, 1)
    for w in VOL_WINDOWS:
        out[f"vol_{w}d"] = _rolling_volatility(log_ret_1d, w)

    # ── 6. Calendar features ──────────────────────────────────────────────
    out["day_of_week"] = pd.Series(
        close.index.dayofweek, index=close.index, name="day_of_week"
    )
    out["month_end_flag"] = _month_end_flag(close.index)

    return pd.DataFrame(out, index=close.index)


def _build_macro_features(
    df: pd.DataFrame,
) -> tuple[pd.DataFrame, list[str], list[str], list[str]]:
    """Build lagged log-return features for available macro columns.

    Parameters
    ----------
    df:
        Merged DataFrame; macro columns are optional.

    Returns
    -------
    macro_feat : pd.DataFrame
        Lagged log-return features for all *available* macro columns.
    available : list[str]
        Macro column names found in ``df``.
    missing : list[str]
        Macro column names absent from ``df``.
    dropped_feat_names : list[str]
        Feature names that would have been generated from missing macros.
    """
    available: list[str] = []
    missing: list[str] = []
    dropped_feat_names: list[str] = []
    frames: list[pd.DataFrame] = []

    for col in MACRO_COLS:
        expected_feats = [f"{col}_lag_ret_{lag}d" for lag in MACRO_LAGS]
        if col not in df.columns or df[col].isna().all():
            missing.append(col)
            dropped_feat_names.extend(expected_feats)
            logger.warning(
                "Macro column '%s' is absent or all-NaN — "
                "dropping features: %s",
                col,
                expected_feats,
            )
            continue

        available.append(col)
        log_ret = _multi_period_log_return(df[col].ffill(), 1)  # daily ret
        col_feats: dict[str, pd.Series] = {}
        for lag in MACRO_LAGS:
            col_feats[f"{col}_lag_ret_{lag}d"] = log_ret.shift(lag)
        frames.append(pd.DataFrame(col_feats, index=df.index))

    macro_feat = pd.concat(frames, axis=1) if frames else pd.DataFrame(index=df.index)
    return macro_feat, available, missing, dropped_feat_names


def _build_targets(close: pd.Series) -> pd.DataFrame:
    """Build direct multi-horizon forward log-return targets.

    target_fwd_{h}d = ln(close_{t+h} / close_t)

    The target is computed by *shifting the log-return series backward* by h
    periods, so the value at row t reflects the future.  This is NOT a
    lookahead in the feature sense — it is the label we want to predict.

    The last ``max(TARGET_HORIZONS)`` rows will have NaN targets.
    """
    log_ret_1d = _multi_period_log_return(close, 1)

    targets: dict[str, pd.Series] = {}
    for h in TARGET_HORIZONS:
        # ln(close_{t+h} / close_t)  =  sum of h daily log-returns starting t+1
        # Equivalently: shift the h-period log-return series backward by h.
        fwd_ret = _multi_period_log_return(close, h)
        targets[f"target_fwd_{h}d"] = fwd_ret.shift(-h)

    # Suppress the intermediate series to avoid confusion.
    del log_ret_1d

    return pd.DataFrame(targets, index=close.index)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def engineer_features(
    merged_df: pd.DataFrame,
    *,
    price_col: str = "close",
) -> EngineeringResult:
    """Build the complete feature matrix and targets from the merged DataFrame.

    Parameters
    ----------
    merged_df:
        Merged DataFrame from the ingestion layer.  Must contain at minimum a
        ``close`` (or ``price_col``) column with a timezone-aware
        ``DatetimeIndex`` sorted ascending.  Optional macro columns (dxy,
        nifty, brent, yield_10y) are used when present.
    price_col:
        Name of the USD/INR close price column.  Defaults to ``"close"``.

    Returns
    -------
    EngineeringResult
        Dataclass with all feature/target splits and metadata.

    Raises
    ------
    KeyError
        If ``price_col`` is absent from ``merged_df``.
    ValueError
        If ``merged_df`` has fewer than ``RSI_PERIOD + 2`` rows (not enough
        data to compute any features).
    """
    if price_col not in merged_df.columns:
        raise KeyError(
            f"Required column '{price_col}' not found in merged DataFrame. "
            f"Available columns: {list(merged_df.columns)}"
        )

    df = merged_df.copy()

    # Ensure ascending time order.
    if not df.index.is_monotonic_increasing:
        df = df.sort_index()

    n_rows = len(df)
    min_rows = RSI_PERIOD + 2
    if n_rows < min_rows:
        raise ValueError(
            f"merged_df has only {n_rows} rows; need at least {min_rows} "
            "to compute features."
        )

    close = df[price_col]

    # ── USD/INR features ──────────────────────────────────────────────────
    usdинр_feat = _build_usdинр_features(close)

    # ── Macro lagged return features ──────────────────────────────────────
    macro_feat, available_macro, missing_macro, dropped_feats = _build_macro_features(df)

    # ── Combine features ──────────────────────────────────────────────────
    if not macro_feat.empty:
        features = pd.concat([usdинр_feat, macro_feat], axis=1)
    else:
        features = usdинр_feat.copy()

    # ── Targets ───────────────────────────────────────────────────────────
    targets = _build_targets(close)

    # ── Train split: drop rows where ALL targets are NaN ──────────────────
    # (The last max-horizon rows will have partial/full NaN targets.)
    any_target_valid = targets.notna().any(axis=1)
    train_mask = any_target_valid

    X_train_ready = features.loc[train_mask]
    y_train_ready = targets.loc[train_mask]

    # ── Live inference row: the very latest observation ───────────────────
    X_live = features.iloc[[-1]]   # single-row DataFrame, preserves index

    feature_names = list(features.columns)

    logger.info(
        "engineer_features complete: %d feature columns (%d dropped), "
        "%d training rows, latest date %s",
        len(feature_names),
        len(dropped_feats),
        len(X_train_ready),
        df.index[-1].date() if hasattr(df.index[-1], "date") else df.index[-1],
    )

    return EngineeringResult(
        features=features,
        targets=targets,
        X_train_ready=X_train_ready,
        y_train_ready=y_train_ready,
        X_live=X_live,
        feature_names=feature_names,
        dropped_features=dropped_feats,
        available_macro=available_macro,
        missing_macro=missing_macro,
    )


# ---------------------------------------------------------------------------
# Leakage test
# ---------------------------------------------------------------------------


def run_leakage_test(
    merged_df: pd.DataFrame,
    *,
    price_col: str = "close",
    n_dates: int = LEAKAGE_TEST_N,
    random_seed: int = 0,
) -> None:
    """Assert that features are computed solely from past information.

    For ``n_dates`` randomly chosen dates ``d`` (with enough history):

    1. Run :func:`engineer_features` on the full ``merged_df`` → ``full``.
    2. Truncate ``merged_df`` at date ``d`` (inclusive) → ``truncated``.
    3. Run :func:`engineer_features` on ``truncated`` → ``trunc``.
    4. Compare row ``d`` in ``full.features`` against ``trunc.features``.
       They must be bitwise-identical (NaN-aware equality).

    Parameters
    ----------
    merged_df:
        The same merged DataFrame passed to :func:`engineer_features`.
    price_col:
        Close-price column name.
    n_dates:
        Number of random probe dates.  Default 20.
    random_seed:
        Seed for reproducible date sampling.

    Raises
    ------
    AssertionError
        If any feature value differs between the full and truncated runs,
        indicating a data leakage bug.
    """
    rng = np.random.default_rng(seed=random_seed)

    if not merged_df.index.is_monotonic_increasing:
        merged_df = merged_df.sort_index()

    # Need at least max(MA_WINDOWS) + max(TARGET_HORIZONS) + RSI_PERIOD rows
    # of history before a probe date to have non-NaN features.
    min_history = max(MA_WINDOWS) + RSI_PERIOD + 5   # 50 + 14 + 5 = 69
    valid_positions = list(range(min_history, len(merged_df)))

    if len(valid_positions) == 0:
        logger.warning(
            "Leakage test skipped: not enough rows (%d) for meaningful probes "
            "(need > %d).",
            len(merged_df),
            min_history,
        )
        return

    chosen_positions = rng.choice(
        valid_positions,
        size=min(n_dates, len(valid_positions)),
        replace=False,
    )
    chosen_positions = sorted(chosen_positions)

    # Run once on the full data set.
    full_result = engineer_features(merged_df, price_col=price_col)
    full_features = full_result.features

    failures: list[str] = []

    for pos in chosen_positions:
        probe_date = merged_df.index[pos]

        # Truncate at probe_date (inclusive).
        truncated = merged_df.loc[:probe_date]
        trunc_result = engineer_features(truncated, price_col=price_col)
        trunc_features = trunc_result.features

        if probe_date not in trunc_features.index:
            # Date dropped (e.g. outlier removal) — skip.
            continue
        if probe_date not in full_features.index:
            continue

        full_row = full_features.loc[probe_date]
        trunc_row = trunc_features.loc[probe_date]

        # Align columns (macro may differ if truncated slice has fewer cols).
        common_cols = full_row.index.intersection(trunc_row.index)
        full_vals = full_row[common_cols]
        trunc_vals = trunc_row[common_cols]

        # NaN-aware bitwise equality:
        #   both NaN → equal; different NaN pattern → not equal.
        both_nan = full_vals.isna() & trunc_vals.isna()
        mismatch = ~both_nan & (full_vals != trunc_vals)

        # Handle floating-point edge cases: treat tiny differences (<1e-10)
        # as equal (they arise only from numerical precision, not leakage).
        numeric_mismatch = mismatch & full_vals.apply(
            lambda x: isinstance(x, (int, float))
        )
        if numeric_mismatch.any():
            abs_diff = (full_vals[numeric_mismatch] - trunc_vals[numeric_mismatch]).abs()
            real_leakage = abs_diff > 1e-10
            if real_leakage.any():
                bad_cols = list(abs_diff[real_leakage].index)
                failures.append(
                    f"Date {probe_date.date()}: leakage detected in "
                    f"columns {bad_cols} "
                    f"(full={full_vals[bad_cols].tolist()}, "
                    f"trunc={trunc_vals[bad_cols].tolist()})"
                )

    if failures:
        msg = "\n".join(failures)
        raise AssertionError(
            f"Leakage test failed for {len(failures)} probe date(s):\n{msg}"
        )

    logger.info(
        "Leakage test passed: %d probe dates, no future data used.",
        len(chosen_positions),
    )
