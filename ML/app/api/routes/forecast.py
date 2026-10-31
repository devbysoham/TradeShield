"""
app/api/routes/forecast.py — GET and POST /forecast endpoints.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_db_session, get_predictor
from app.api.schemas import (
    ForecastRequest,
    ForecastResponse,
    GetForecastResponse,
    HorizonBandSchema,
)
from app.data.db import get_session_factory
from app.data.repository import FxRepository
from app.features.engineer import engineer_features
from app.jobs.retrain_job import fetch_merged_data_from_db
from app.jobs.scheduler import log_audit_event
from app.models.predictor import Predictor

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.get("", response_model=GetForecastResponse, summary="Get calibrated FX forecast")
async def get_forecast(
    horizon: int = Query(default=15, ge=1, le=15, description="Business days forecast horizon (1..15)"),
    predictor: Predictor = Depends(get_predictor),
) -> GetForecastResponse:
    """Return calibrated USD/INR forecast bands and trajectory.

    Returns:
    - dates: list of ISO business dates
    - median: median price trajectory
    - bands_50: lower and upper bounds of 50% confidence band (25th and 75th percentiles)
    - bands_90: lower and upper bounds of calibrated 90% confidence band (5th and 95th percentiles)
    - current_rate: current USD/INR spot price
    - data_freshness: ISO timestamp of latest market data
    - model_version: active model version
    - has_edge: whether the model shows a statistically validated edge for this horizon
    """
    session_factory = get_session_factory()
    fx_repo = FxRepository(session_factory)
    latest_tick = await fx_repo.get_latest_tick("USDINR")

    current_rate = float(latest_tick.close) if latest_tick else 84.0
    data_freshness = (
        latest_tick.ts.isoformat()
        if latest_tick and latest_tick.ts
        else datetime.now(tz=timezone.utc).isoformat()
    )

    merged_df = await fetch_merged_data_from_db()
    eng = engineer_features(merged_df)
    live_row = eng.X_live

    forecast_res = predictor.predict(
        live_row,
        current_spot=current_rate,
        horizon_days=horizon,
    )

    dates = [f.business_date for f in forecast_res.forecasts]
    medians = [round(f.median, 4) for f in forecast_res.forecasts]
    lower_50 = [round(f.lower_50, 4) for f in forecast_res.forecasts]
    upper_50 = [round(f.upper_50, 4) for f in forecast_res.forecasts]
    lower_90 = [round(f.lower_90, 4) for f in forecast_res.forecasts]
    upper_90 = [round(f.upper_90, 4) for f in forecast_res.forecasts]

    has_edge = predictor.has_edge_by_horizon.get(horizon, False)

    # Log to audit_log
    await log_audit_event(
        action="forecast",
        model_version=predictor.version,
        input_data_ts=latest_tick.ts if latest_tick else None,
        request_params={"horizon": horizon},
        response_data={"current_rate": current_rate, "has_edge": has_edge, "median": medians[-1]},
    )

    return GetForecastResponse(
        horizon=horizon,
        current_rate=round(current_rate, 4),
        dates=dates,
        median=medians,
        bands_50=HorizonBandSchema(lower=lower_50, upper=upper_50),
        bands_90=HorizonBandSchema(lower=lower_90, upper=upper_90),
        data_freshness=data_freshness,
        model_version=predictor.version,
        has_edge=has_edge,
    )
