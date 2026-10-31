"""
app/api/schemas.py — Pydantic v2 request and response schemas.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.decision.advisor import AdviceDecision, DecisionReasoning, PriceBand


# ── Shared enums ──────────────────────────────────────────────────────────────

class TradeType(str, Enum):
    EXPORT = "EXPORT"
    IMPORT = "IMPORT"


# ── GET /forecast endpoint ───────────────────────────────────────────────────

class HorizonBandSchema(BaseModel):
    """Lower and upper price limits for a confidence band."""

    lower: list[float]
    upper: list[float]


class GetForecastResponse(BaseModel):
    """Response schema for GET /forecast."""

    horizon: int
    current_rate: float
    dates: list[str]
    median: list[float]
    bands_50: HorizonBandSchema
    bands_90: HorizonBandSchema
    data_freshness: str
    model_version: str
    has_edge: bool


# ── POST /forecast endpoint (legacy/extended) ─────────────────────────────────

class ForecastRequest(BaseModel):
    """Request body for POST /forecast."""

    symbol: str = Field(
        default="USDINR",
        description="Currency pair to forecast (currently only USDINR supported).",
    )
    trade_type: TradeType = Field(
        ...,
        description="Whether the user is an exporter or importer.",
    )
    exposure_inr: float | None = Field(
        default=None,
        ge=0,
        description="Notional trade exposure in INR for hedging suggestions.",
    )


class DayForecastSchema(BaseModel):
    """Calibrated forecast for one business day."""

    business_date: str
    lower: float
    upper: float
    point: float
    interval_probability: float


class RiskAssessmentSchema(BaseModel):
    """Risk tier and directional signal."""

    tier: Literal["LOW", "MEDIUM", "HIGH"]
    signal: Literal["DEPRECIATION_RISK", "APPRECIATION_RISK", "NEUTRAL"]
    interval_width_pct: float
    recommendation: str


class HedgeSuggestionSchema(BaseModel):
    """Hedging advice (returned only when exposure_inr is provided)."""

    recommended_cover_pct: float
    estimated_forward_premium_pct: float
    rationale: str


class ForecastResponse(BaseModel):
    """Response body for POST /forecast."""

    generated_at: datetime
    symbol: str
    horizon_days: int
    forecasts: list[DayForecastSchema]
    risk: RiskAssessmentSchema
    hedge: HedgeSuggestionSchema | None = None
    alerts: list[str] = Field(default_factory=list)


# ── GET /advice endpoint ─────────────────────────────────────────────────────

class GetAdviceResponse(BaseModel):
    """Response schema for GET /advice."""

    decision: AdviceDecision
    reason: str
    reasoning: DecisionReasoning


# ── GET /health endpoint ─────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    """Response body for GET /health."""

    status: Literal["ok", "degraded", "warming_up"]
    db: Literal["ok", "error"]
    model_loaded: bool
    model_version: str | None = None
    model_age_seconds: float | None = None
    model_age_days: float | None = None
    last_data_update: dict[str, str | None] = Field(default_factory=dict)
    stale_flags: dict[str, bool] = Field(default_factory=dict)
    timestamp: datetime


# ── POST /admin/retrain endpoint ─────────────────────────────────────────────

class RetrainResponse(BaseModel):
    """Response body for POST /admin/retrain."""

    status: str
    version: str
    train_end_date: str
    n_train_samples: int
    summary: str
