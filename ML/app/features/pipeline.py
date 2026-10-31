"""
app/features/pipeline.py — End-to-end feature engineering orchestration.

Pipeline stages
───────────────
  1. clean_ohlcv()         — business-day filter, dedup, outlier removal
  2. technical indicators  — RSI, MAs, ATR, Bollinger, lags, log-returns
  3. macro alignment       — forward-fill macro series; mask missing ones
  4. target construction   — direct multi-horizon future returns
                             (target_t+1, …, target_t+15) derived from
                             future close prices; no leakage (shift back)
  5. train / test split    — strictly time-ordered, no shuffling
  6. scaling               — StandardScaler fit on train only, applied to test

Outputs
───────
  X_train, X_test : pd.DataFrame of features
  y_train, y_test : pd.DataFrame of direct multi-step targets
  scaler          : fitted sklearn StandardScaler (serialised by model layer)

TODO: Implement ``build_feature_matrix`` function body.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import pandas as pd
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)


@dataclass
class FeatureSet:
    """Container for the outputs of the feature pipeline."""

    X_train: pd.DataFrame
    X_test: pd.DataFrame
    y_train: pd.DataFrame
    y_test: pd.DataFrame
    scaler: StandardScaler
    feature_names: list[str]
    train_end_date: str


def build_feature_matrix(
    fx_df: pd.DataFrame,
    macro_frames: dict[str, pd.DataFrame | None],
    horizon: int = 15,
    test_fraction: float = 0.2,
    outlier_sigma: float = 5.0,
) -> FeatureSet:
    """Build the full feature matrix from raw FX and macro data.

    Parameters
    ----------
    fx_df:
        Raw OHLCV DataFrame for USD/INR with tz-aware DatetimeIndex.
    macro_frames:
        Optional macro feeds (``None`` entries are gracefully masked).
    horizon:
        Number of business days to forecast.
    test_fraction:
        Fraction of the time-ordered data held out for evaluation.
    outlier_sigma:
        Sigma threshold for bad-tick removal.

    Returns
    -------
    FeatureSet
        Named container with train/test splits, fitted scaler, and metadata.
    """
    # TODO: implement
    raise NotImplementedError
