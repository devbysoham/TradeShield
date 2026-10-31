"""
app/features/macro.py — Macro feature alignment, forward-fill and masking.

Responsibilities
────────────────
* Align lower-frequency macro series (monthly, weekly) to the business-day
  index of the FX series via forward-fill.
* If any macro feed returned ``None`` (unavailable), insert a column of NaNs
  and log a WARNING — the pipeline continues without that feature.
* Normalise macro series using a StandardScaler fitted on the train slice
  only (scaler instance passed in, never fitted inside this module to avoid
  leakage in inference).

TODO: Implement ``align_macro`` and ``mask_missing_macro`` functions.
"""

from __future__ import annotations

import logging

import pandas as pd

logger = logging.getLogger(__name__)


def align_macro(
    fx_index: pd.DatetimeIndex,
    macro_frames: dict[str, pd.DataFrame | None],
) -> pd.DataFrame:
    """Align macro series to the FX business-day index.

    Parameters
    ----------
    fx_index:
        Business-day DatetimeIndex from the cleaned FX series.
    macro_frames:
        Mapping of feature name → DataFrame (or ``None`` if unavailable).
        Each DataFrame must have a tz-aware DatetimeIndex and a ``value``
        column.

    Returns
    -------
    pandas.DataFrame
        Wide DataFrame indexed by ``fx_index`` with one column per macro
        series; unavailable feeds produce an all-NaN column.
    """
    # TODO: implement
    raise NotImplementedError


def mask_missing_macro(df: pd.DataFrame) -> pd.DataFrame:
    """Log a warning for each all-NaN macro column and leave it as-is.

    Models downstream must handle NaN features (e.g. XGBoost handles them
    natively; scikit-learn pipelines should include a SimpleImputer).

    Parameters
    ----------
    df:
        Feature DataFrame potentially containing all-NaN macro columns.

    Returns
    -------
    pandas.DataFrame unchanged — this function is a logging side-effect only.
    """
    # TODO: implement
    raise NotImplementedError
