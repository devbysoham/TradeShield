"""
app/features/technical.py — Technical indicator computation (pandas/NumPy only).

All indicators are implemented from scratch using pandas rolling/ewm
and NumPy — no pandas_ta, TA-Lib or any third-party TA library.

Indicators planned
──────────────────
  rsi(series, period)              — Relative Strength Index (Wilder smoothing)
  sma(series, window)              — Simple Moving Average
  ema(series, span)                — Exponential Moving Average
  bollinger_bands(series, window)  — Upper / lower bands (±2 σ)
  atr(high, low, close, period)    — Average True Range
  log_returns(series)              — Log-return series
  rolling_volatility(series, window) — Rolling std of log-returns (annualised)
  lag_features(df, lags)           — Shift close/return columns by N lags

Leakage note
────────────
* Callers must pass only the training window when fitting any look-back
  parameter.  These functions are stateless — they compute on whatever
  slice is passed in.

TODO: Implement each function body in the next iteration.
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """Compute RSI using Wilder's smoothing method.

    The first ``period`` rows are NaN (seeding period).  From row ``period``
    onward, the Wilder recurrence is applied:

        avg_gain_t = (avg_gain_{t-1} * (period-1) + gain_t) / period

    RSI = 100 − 100 / (1 + avg_gain / avg_loss).

    Parameters
    ----------
    series:
        Close price series with DatetimeIndex.
    period:
        Look-back period (default 14).

    Returns
    -------
    pandas.Series of RSI values in [0, 100].
    """
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = (-delta).clip(lower=0)

    n = len(series)
    avg_gain = np.full(n, np.nan)
    avg_loss = np.full(n, np.nan)

    if n < period + 1:
        return pd.Series(np.nan, index=series.index, name=series.name)

    # Seed: plain mean of the first ``period`` increments (rows 1 .. period).
    avg_gain[period] = gain.iloc[1 : period + 1].mean()
    avg_loss[period] = loss.iloc[1 : period + 1].mean()

    alpha = (period - 1) / period
    for i in range(period + 1, n):
        avg_gain[i] = alpha * avg_gain[i - 1] + (1 - alpha) * gain.iloc[i]
        avg_loss[i] = alpha * avg_loss[i - 1] + (1 - alpha) * loss.iloc[i]

    with np.errstate(divide="ignore", invalid="ignore"):
        rs = np.where(avg_loss == 0, np.inf, avg_gain / avg_loss)
        rsi_vals = 100 - 100 / (1 + rs)

    rsi_vals[:period] = np.nan
    rsi_vals = np.clip(rsi_vals, 0.0, 100.0)

    return pd.Series(rsi_vals, index=series.index, name=series.name)


def sma(series: pd.Series, window: int) -> pd.Series:
    """Simple moving average.

    Parameters
    ----------
    series:
        Input price or return series.
    window:
        Rolling window size in bars.
    """
    return series.rolling(window=window, min_periods=window).mean()


def ema(series: pd.Series, span: int) -> pd.Series:
    """Exponential moving average (pandas ewm, adjust=False).

    Parameters
    ----------
    series:
        Input price or return series.
    span:
        EMA span parameter.
    """
    return series.ewm(span=span, adjust=False, min_periods=span).mean()


def bollinger_bands(
    series: pd.Series, window: int = 20, num_std: float = 2.0
) -> pd.DataFrame:
    """Compute Bollinger Bands.

    Returns
    -------
    DataFrame with columns ``['bb_upper', 'bb_mid', 'bb_lower', 'bb_pct_b']``.
    """
    # TODO: implement
    raise NotImplementedError


def atr(
    high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14
) -> pd.Series:
    """Average True Range using Wilder smoothing.

    Returns
    -------
    pandas.Series of ATR values.
    """
    # TODO: implement
    raise NotImplementedError


def log_returns(series: pd.Series) -> pd.Series:
    """Compute log-return series: ln(P_t / P_{t-1}).

    Returns
    -------
    pandas.Series of log-returns (first element NaN).
    """
    return np.log(series / series.shift(1))


def rolling_volatility(series: pd.Series, window: int = 21) -> pd.Series:
    """Rolling annualised volatility of log-returns.

    Parameters
    ----------
    series:
        Log-return series.
    window:
        Rolling window in business days.

    Returns
    -------
    pandas.Series of annualised volatility values.
    """
    return series.rolling(window=window, min_periods=window).std() * np.sqrt(252)


def lag_features(df: pd.DataFrame, lags: list[int]) -> pd.DataFrame:
    """Add shifted copies of close / return columns.

    Parameters
    ----------
    df:
        Feature DataFrame; must contain a ``close`` column.
    lags:
        List of positive integer lag values (e.g. ``[1, 2, 5, 10]``).

    Returns
    -------
    pandas.DataFrame with additional ``close_lag_{n}`` and
    ``return_lag_{n}`` columns appended.
    """
    result = df.copy()
    log_ret = np.log(df["close"] / df["close"].shift(1))
    for lag in lags:
        result[f"close_lag_{lag}"] = df["close"].shift(lag)
        result[f"return_lag_{lag}"] = log_ret.shift(lag)
    return result
