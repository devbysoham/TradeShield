"""
app/api/routes/advice.py — GET /advice endpoint for MSME hedging decisions.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_advisor, get_predictor
from app.api.schemas import GetAdviceResponse
from app.data.db import get_session_factory
from app.data.repository import FxRepository
from app.decision.advisor import Advisor, TradeDirection
from app.features.engineer import engineer_features
from app.jobs.retrain_job import fetch_merged_data_from_db
from app.jobs.scheduler import log_audit_event
from app.models.predictor import Predictor

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/advice", tags=["advice"])


@router.get("", response_model=GetAdviceResponse, summary="Get transparent FX hedging advice")
async def get_advice(
    direction: TradeDirection = Query(
        ...,
        description="'exporter' (selling USD) or 'importer' (buying USD)",
    ),
    amount_usd: float = Query(
        ...,
        gt=0,
        description="Trade exposure in USD",
    ),
    horizon: int = Query(
        default=15,
        ge=1,
        le=15,
        description="Business days horizon (e.g. 1, 3, 5, 10, 15)",
    ),
    threshold: float | None = Query(
        default=None,
        ge=0.0,
        description="Optional override for expected_gain / downside_risk threshold (default 0.5)",
    ),
    predictor: Predictor = Depends(get_predictor),
    advisor: Advisor = Depends(get_advisor),
) -> GetAdviceResponse:
    """Generate transparent, rule-based FX hedging decision.

    Decision rule:
    - expected_gain = expected favorable move in INR per USD over the horizon
      (from median forecast vs current forward-adjusted rate)
    - downside_risk = distance from current rate to the 5th/95th quantile on adverse side
    - If has_edge is False OR expected_gain / downside_risk < threshold (default 0.5):
        returns LOCK_NOW with reason "no reliable edge"
    - Otherwise:
        returns WAIT with expected range and probability of a better rate
    - Returns structured reasoning for UI rendering.
    """
    session_factory = get_session_factory()
    fx_repo = FxRepository(session_factory)
    latest_tick = await fx_repo.get_latest_tick("USDINR")

    current_rate = float(latest_tick.close) if latest_tick else 84.0

    merged_df = await fetch_merged_data_from_db()
    eng = engineer_features(merged_df)
    live_row = eng.X_live

    pred_h = predictor.predict_horizon(live_row, current_spot=current_rate, horizon=horizon)
    rates = pred_h["rates"]
    has_edge = pred_h["has_edge"]

    advice_res = advisor.evaluate(
        direction=direction,
        amount_usd=amount_usd,
        horizon_days=horizon,
        current_spot=current_rate,
        predicted_rates=rates,
        has_edge=has_edge,
        threshold=threshold,
    )

    # Log to audit_log
    await log_audit_event(
        action="advice",
        model_version=predictor.version,
        input_data_ts=latest_tick.ts if latest_tick else None,
        request_params={"direction": direction, "amount_usd": amount_usd, "horizon": horizon},
        response_data=advice_res.model_dump(),
        decision=advice_res.decision.value,
    )

    return GetAdviceResponse(
        decision=advice_res.decision,
        reason=advice_res.reason,
        reasoning=advice_res.reasoning,
    )
