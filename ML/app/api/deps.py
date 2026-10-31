"""
app/api/deps.py — FastAPI dependency injection providers.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from typing import Any

from fastapi import Depends, Header, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.data.db import get_db_session
from app.decision.advisor import Advisor
from app.models.predictor import Predictor
from app.models.train import latest_version, load

logger = logging.getLogger(__name__)

# Application singletons managed across lifespan
_predictor: Predictor | None = None
_advisor: Advisor | None = None
_is_ready: bool = False
_warmup_message: str = "Service is warming up: ingesting data and training initial model. Please try again shortly."


def set_service_ready(ready: bool, message: str | None = None) -> None:
    """Update service readiness state."""
    global _is_ready, _warmup_message
    _is_ready = ready
    if message:
        _warmup_message = message


def is_service_ready() -> bool:
    """Check whether the service is warm and ready to serve forecasts."""
    return _is_ready and _predictor is not None


def get_warmup_message() -> str:
    """Return the current warming up status message."""
    return _warmup_message


def set_predictor(predictor: Predictor | None) -> None:
    """Set the in-memory Predictor singleton."""
    global _predictor
    _predictor = predictor


def load_predictor_from_version(version: str | None = None) -> Predictor | None:
    """Load model artefacts into a Predictor instance."""
    try:
        models, scalers, offsets, metadata = load(version)
        pred = Predictor(models, scalers, offsets, metadata)
        set_predictor(pred)
        logger.info("Loaded Predictor with model version: %s", pred.version)
        return pred
    except Exception as exc:
        logger.warning("Could not load predictor: %s", exc)
        return None


async def get_predictor(settings: Settings = Depends(get_settings)) -> Predictor:
    """FastAPI dependency: Return the loaded Predictor or raise 503 if warming up."""
    global _predictor
    if not is_service_ready() or _predictor is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=_warmup_message,
            headers={"Retry-After": "10"},
        )
    return _predictor


async def get_advisor(settings: Settings = Depends(get_settings)) -> Advisor:
    """FastAPI dependency: Return the Advisor instance."""
    global _advisor
    if _advisor is None:
        _advisor = Advisor(
            default_threshold=settings.advice_gain_risk_threshold,
            annual_forward_premium_pct=settings.annual_forward_premium_pct,
        )
    return _advisor


async def verify_admin_key(
    x_admin_key: str | None = Header(default=None, alias="X-Admin-Key"),
    admin_key: str | None = Query(default=None),
    settings: Settings = Depends(get_settings),
) -> bool:
    """FastAPI dependency: Enforce admin authentication for privileged routes."""
    provided_key = x_admin_key or admin_key
    # Allow in development if key matches or is default
    if provided_key != settings.admin_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing admin credentials (provide header 'X-Admin-Key').",
        )
    return True
