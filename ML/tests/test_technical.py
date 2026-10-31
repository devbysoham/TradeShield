"""
tests/test_technical.py — Unit tests for app.features.technical.

All data is generated procedurally via the ``sample_fx_df`` fixture.
"""

from __future__ import annotations

import numpy as np
import pytest


def test_rsi_bounds(sample_fx_df):
    """RSI values must be in [0, 100]."""
    from app.features.technical import rsi

    result = rsi(sample_fx_df["close"], period=14)
    valid = result.dropna()
    assert (valid >= 0).all() and (valid <= 100).all()


def test_rsi_length(sample_fx_df):
    """RSI output length must equal input length."""
    from app.features.technical import rsi

    result = rsi(sample_fx_df["close"], period=14)
    assert len(result) == len(sample_fx_df)


def test_sma_first_valid(sample_fx_df):
    """First (window-1) values of SMA must be NaN."""
    from app.features.technical import sma

    window = 10
    result = sma(sample_fx_df["close"], window=window)
    assert result.iloc[:window - 1].isna().all()
    assert not result.iloc[window - 1:].isna().any()


def test_log_returns_first_nan(sample_fx_df):
    """First log-return must be NaN (no prior price)."""
    from app.features.technical import log_returns

    result = log_returns(sample_fx_df["close"])
    assert np.isnan(result.iloc[0])
    assert not result.iloc[1:].isna().any()


def test_rolling_volatility_positive(sample_fx_df):
    """Annualised volatility must be non-negative."""
    from app.features.technical import log_returns, rolling_volatility

    ret = log_returns(sample_fx_df["close"])
    result = rolling_volatility(ret, window=21)
    assert (result.dropna() >= 0).all()


def test_lag_features_columns(sample_fx_df):
    """Lag features must add correctly named columns."""
    from app.features.technical import lag_features

    df = sample_fx_df[["close"]].copy()
    result = lag_features(df, lags=[1, 5])
    assert "close_lag_1" in result.columns
    assert "close_lag_5" in result.columns
