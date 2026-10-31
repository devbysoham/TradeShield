"""
tests/test_cleaning.py — Unit tests for app.features.cleaning.

Tests use the procedurally generated ``sample_fx_df`` fixture — no CSV/JSON.
Each test is marked ``xfail`` until the implementation is complete.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest


@pytest.mark.xfail(reason="cleaning.clean_ohlcv not yet implemented", strict=True)
def test_drops_duplicate_timestamps(sample_fx_df):
    """Rows with duplicate timestamps are reduced to one."""
    from app.features.cleaning import clean_ohlcv

    duped = pd.concat([sample_fx_df, sample_fx_df.iloc[:5]])
    result = clean_ohlcv(duped)
    assert result.index.duplicated().sum() == 0


@pytest.mark.xfail(reason="cleaning.clean_ohlcv not yet implemented", strict=True)
def test_drops_non_positive_close(sample_fx_df):
    """Rows where close ≤ 0 are removed."""
    from app.features.cleaning import clean_ohlcv

    sample_fx_df = sample_fx_df.copy()
    sample_fx_df.iloc[10, sample_fx_df.columns.get_loc("close")] = -1.0
    result = clean_ohlcv(sample_fx_df)
    assert (result["close"] > 0).all()


@pytest.mark.xfail(reason="cleaning.clean_ohlcv not yet implemented", strict=True)
def test_drops_extreme_outlier_returns(sample_fx_df):
    """Rows with daily moves > 5 sigma are dropped."""
    from app.features.cleaning import clean_ohlcv

    sample_fx_df = sample_fx_df.copy()
    # Inject a massive spike
    sample_fx_df.iloc[50, sample_fx_df.columns.get_loc("close")] *= 2.5
    result = clean_ohlcv(sample_fx_df, outlier_sigma=5.0)
    # The spike row should be gone
    assert len(result) < len(sample_fx_df)


@pytest.mark.xfail(reason="cleaning.clean_ohlcv not yet implemented", strict=True)
def test_result_is_sorted_ascending(sample_fx_df):
    """Output DataFrame index must be strictly monotonically increasing."""
    from app.features.cleaning import clean_ohlcv

    shuffled = sample_fx_df.sample(frac=1, random_state=0)
    result = clean_ohlcv(shuffled)
    assert result.index.is_monotonic_increasing


@pytest.mark.xfail(reason="cleaning.clean_ohlcv not yet implemented", strict=True)
def test_only_business_days(sample_fx_df):
    """Output index contains only business days."""
    from app.features.cleaning import clean_ohlcv

    result = clean_ohlcv(sample_fx_df)
    # All dates should be Mon–Fri
    assert (result.index.day_of_week < 5).all()
