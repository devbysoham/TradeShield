"""
tests/test_schemas.py — Pydantic schema validation tests (importable immediately).
"""

from __future__ import annotations

from datetime import datetime, timezone

from app.api.schemas import ForecastRequest, ForecastResponse, HealthResponse, TradeType


def test_forecast_request_defaults():
    """ForecastRequest defaults to USDINR and no exposure."""
    req = ForecastRequest(trade_type=TradeType.EXPORT)
    assert req.symbol == "USDINR"
    assert req.exposure_inr is None


def test_health_response_fields():
    """HealthResponse accepts all valid literal combinations."""
    r = HealthResponse(
        status="ok",
        db="ok",
        model_loaded=True,
        timestamp=datetime.now(tz=timezone.utc),
    )
    assert r.status == "ok"
    assert r.model_loaded is True
