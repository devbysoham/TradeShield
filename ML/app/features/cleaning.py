"""
app/features/cleaning.py — Data quality enforcement for time-series inputs.

Rules applied (in order)
────────────────────────
1. Drop duplicate timestamps (keep first).
2. Restrict index to business days using pandas ``BDay`` / ``CustomBusinessDay``.
3. Drop any row where close ≤ 0 (non-positive prices are invalid ticks).
4. Drop rows where the absolute daily log-return exceeds ``outlier_sigma``
   standard deviations of the *training* period (configurable, default 5 σ).
5. Sort ascending by timestamp.

Leakage safeguard
─────────────────
* The sigma threshold is computed on the train slice only and passed in
  explicitly — never computed on the full series including future data.

TODO: Implement ``clean_ohlcv`` function body.
"""

from __future__ import annotations

import logging

import pandas as pd

logger = logging.getLogger(__name__)


def clean_ohlcv(
    df: pd.DataFrame,
    outlier_sigma: float = 5.0,
    train_end: str | None = None,
) -> pd.DataFrame:
    """Clean an OHLCV DataFrame to business-day, deduped, outlier-free form.

    Parameters
    ----------
    df:
        Raw OHLCV DataFrame with a tz-aware DatetimeIndex.
    outlier_sigma:
        Log-return moves beyond this many sigma are dropped.
    train_end:
        ISO-8601 date string marking the end of the training period.
        Sigma is estimated from rows up to (and including) this date.
        If ``None``, sigma is estimated from the full series — only use
        this during initial exploration, never during inference.

    Returns
    -------
    pandas.DataFrame
        Cleaned DataFrame sorted ascending by timestamp.
    """
    # TODO: implement
    raise NotImplementedError
