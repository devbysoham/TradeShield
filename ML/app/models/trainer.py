"""
app/models/trainer.py — XGBoost multi-horizon quantile regression training.

Strategy
────────
* Train three XGBRegressor models per horizon day:
    - lower_model  : objective = ``reg:quantileerror``, alpha = lower quantile
    - upper_model  : objective = ``reg:quantileerror``, alpha = upper quantile
    - point_model  : objective = ``reg:squarederror`` (used for calibration)
* Targets are direct multi-step (t+1 … t+H) derived from future close prices
  — no recursive forecasting to avoid error accumulation.
* Time-ordered cross-validation (TimeSeriesSplit) for hyper-param search.
* Scaler is received pre-fitted from the feature pipeline — never re-fitted
  here to prevent data leakage.

TODO: Implement ``QuantileModelBundle`` and ``train_models`` in the next iteration.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)


@dataclass
class QuantileModelBundle:
    """Holds lower, upper and point models for one forecast horizon day."""

    horizon_day: int
    lower_model: object | None = field(default=None)
    upper_model: object | None = field(default=None)
    point_model: object | None = field(default=None)


def train_models(
    feature_set,  # FeatureSet from features.pipeline
    n_estimators: int = 500,
    learning_rate: float = 0.05,
    max_depth: int = 5,
    n_jobs: int = -1,
) -> list[QuantileModelBundle]:
    """Train quantile models for each horizon day.

    Parameters
    ----------
    feature_set:
        ``FeatureSet`` from ``app.features.pipeline.build_feature_matrix``.
    n_estimators, learning_rate, max_depth, n_jobs:
        XGBoost hyper-parameters (will be replaced by TimeSeriesSplit search).

    Returns
    -------
    list[QuantileModelBundle]
        One bundle per horizon day (length == ``feature_set.y_train.shape[1]``).
    """
    # TODO: implement
    raise NotImplementedError
