"""
app/decision/risk_engine.py — FX risk tier classification and hedging signals.

Logic (to be implemented)
─────────────────────────
* Map interval width (upper - lower) and directional bias to a risk tier:
    LOW    — interval width < 1 σ of historical volatility
    MEDIUM — 1 σ ≤ width < 2 σ
    HIGH   — width ≥ 2 σ
* Compute a directional signal:
    DEPRECIATION_RISK (INR weakens — bad for importers)
    APPRECIATION_RISK  (INR strengthens — bad for exporters)
    NEUTRAL
* Risk tier and signal together form the ``RiskAssessment`` output.

TODO: Implement ``RiskEngine`` and ``RiskAssessment`` dataclass.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class RiskTier(str, Enum):
    """Ordinal risk tier for the forecast interval width."""

    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class DirectionalSignal(str, Enum):
    """Directional bias of the forecast."""

    DEPRECIATION_RISK = "DEPRECIATION_RISK"
    APPRECIATION_RISK = "APPRECIATION_RISK"
    NEUTRAL = "NEUTRAL"


@dataclass
class RiskAssessment:
    """Structured risk output for a single FX forecast."""

    tier: RiskTier
    signal: DirectionalSignal
    interval_width_pct: float   # (upper - lower) / current spot, as %
    recommendation: str         # human-readable advice string


class RiskEngine:
    """Classifies FX forecast risk and produces hedging recommendations.

    TODO: Implement ``assess`` method.
    """

    def assess(self, forecast_result, current_spot: float) -> RiskAssessment:
        """Produce a risk assessment from a ``ForecastResult``.

        Parameters
        ----------
        forecast_result:
            ``ForecastResult`` from ``app.models.predictor.Predictor``.
        current_spot:
            Current USD/INR spot rate.

        Returns
        -------
        RiskAssessment
        """
        # TODO: implement
        raise NotImplementedError
