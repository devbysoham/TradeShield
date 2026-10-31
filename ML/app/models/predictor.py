"""
app/models/predictor.py — Inference wrapper for the multi-horizon FX forecast.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import numpy as np
import pandas as pd

from app.models.train import NOMINAL_COVERAGE, QUANTILES, TARGET_HORIZONS

logger = logging.getLogger(__name__)


@dataclass
class DayForecast:
    """Calibrated forecast for a single forecast horizon."""

    business_date: str          # ISO-8601 date string
    horizon_day: int            # e.g. 1, 3, 5, 10, 15
    lower_90: float             # calibrated 5th percentile price
    upper_90: float             # calibrated 95th percentile price
    lower_50: float             # 25th percentile price
    upper_50: float             # 75th percentile price
    median: float               # 50th percentile price (point estimate)
    interval_probability: float # nominal coverage, e.g. 0.90
    has_edge: bool


@dataclass
class ForecastResult:
    """Full calibrated forecast across all available horizons."""

    generated_at: str           # UTC ISO-8601 timestamp
    symbol: str                 # e.g. "USDINR"
    current_spot: float
    horizon_days: int           # maximum requested horizon (e.g. 15)
    forecasts: list[DayForecast]
    model_version: str


class Predictor:
    """Inference wrapper for the trained quantile models.

    Parameters
    ----------
    models_by_horizon:
        dict[int, dict[float, model]] mapping horizon -> quantile -> model.
    scalers_by_horizon:
        dict[int, StandardScaler] mapping horizon -> scaler.
    offsets_by_horizon:
        dict[int, float] mapping horizon -> CQR offset.
    metadata:
        dict containing training metadata (feature_names, metrics, etc.).
    """

    def __init__(
        self,
        models_by_horizon: dict[int, dict[float, Any]],
        scalers_by_horizon: dict[int, Any],
        offsets_by_horizon: dict[int, float],
        metadata: dict[str, Any],
    ) -> None:
        self.models_by_horizon = models_by_horizon
        self.scalers_by_horizon = scalers_by_horizon
        self.offsets_by_horizon = offsets_by_horizon
        self.metadata = metadata

        self.version: str = metadata.get("version", "unknown")
        self.feature_names: list[str] = metadata.get("feature_names", [])
        self.backend: str = metadata.get("backend", "xgboost")
        self.created_at: str = metadata.get("created_at_utc", metadata.get("train_end_date", ""))

        # Check has_edge per horizon
        metrics = metadata.get("metrics", {})
        self.has_edge_by_horizon: dict[int, bool] = {}
        for h in TARGET_HORIZONS:
            h_metrics = metrics.get(str(h), {})
            self.has_edge_by_horizon[h] = bool(h_metrics.get("has_edge", False))

    def predict_horizon(
        self,
        feature_row: pd.DataFrame,
        current_spot: float,
        horizon: int,
    ) -> dict[str, Any]:
        """Compute calibrated quantile rates for a specific horizon.

        Returns
        -------
        dict with keys:
          - rates: dict[float, float] (0.05, 0.25, 0.50, 0.75, 0.95)
          - log_returns: dict[float, float]
          - has_edge: bool
          - cqr_offset: float
        """
        if horizon not in self.models_by_horizon:
            # Fall back to nearest available horizon
            available = sorted(self.models_by_horizon.keys())
            if not available:
                raise ValueError("No trained horizons in predictor")
            nearest = min(available, key=lambda x: abs(x - horizon))
            horizon = nearest

        models = self.models_by_horizon[horizon]
        scaler = self.scalers_by_horizon[horizon]
        offset = self.offsets_by_horizon.get(horizon, 0.0)
        has_edge = self.has_edge_by_horizon.get(horizon, False)

        # Align features
        feats = feature_row[self.feature_names].to_numpy(dtype=float)
        feats_scaled = scaler.transform(feats)

        # Predict log returns for each quantile
        raw_preds = {q: float(models[q].predict(feats_scaled)[0]) for q in QUANTILES}

        # Apply CQR offset to 90% interval (0.05 and 0.95)
        adj_05 = raw_preds[0.05] - offset
        adj_95 = raw_preds[0.95] + offset

        # Ensure quantile monotonicity
        adj_log_returns = {
            0.05: adj_05,
            0.25: raw_preds[0.25],
            0.50: raw_preds[0.50],
            0.75: raw_preds[0.75],
            0.95: adj_95,
        }

        # Convert log returns to spot rates: P_t+h = S_t * exp(r)
        rates = {q: float(current_spot * np.exp(r)) for q, r in adj_log_returns.items()}

        # Enforce ordering on rates
        sorted_rates = sorted(rates.values())
        rates = {
            0.05: sorted_rates[0],
            0.25: sorted_rates[1],
            0.50: sorted_rates[2],
            0.75: sorted_rates[3],
            0.95: sorted_rates[4],
        }

        return {
            "horizon": horizon,
            "rates": rates,
            "log_returns": adj_log_returns,
            "has_edge": has_edge,
            "cqr_offset": offset,
        }

    def predict(
        self,
        feature_row: pd.DataFrame,
        current_spot: float,
        horizon_days: int = 15,
        symbol: str = "USDINR",
        reference_date: pd.Timestamp | None = None,
    ) -> ForecastResult:
        """Generate forecasts across all horizons up to horizon_days."""
        if reference_date is None:
            reference_date = pd.Timestamp.now(tz="UTC")

        horizons = [h for h in TARGET_HORIZONS if h <= horizon_days]
        if not horizons:
            horizons = [min(TARGET_HORIZONS)]

        forecasts: list[DayForecast] = []
        for h in horizons:
            res = self.predict_horizon(feature_row, current_spot, h)
            rates = res["rates"]

            # Compute business target date
            target_date = reference_date + pd.tseries.offsets.BDay(h)
            target_str = target_date.strftime("%Y-%m-%d")

            forecasts.append(
                DayForecast(
                    business_date=target_str,
                    horizon_day=h,
                    lower_90=rates[0.05],
                    upper_90=rates[0.95],
                    lower_50=rates[0.25],
                    upper_50=rates[0.75],
                    median=rates[0.50],
                    interval_probability=NOMINAL_COVERAGE,
                    has_edge=res["has_edge"],
                )
            )

        return ForecastResult(
            generated_at=datetime.now(tz=timezone.utc).isoformat(),
            symbol=symbol,
            current_spot=current_spot,
            horizon_days=horizon_days,
            forecasts=forecasts,
            model_version=self.version,
        )
