"""
app/api/routes/health.py — GET /health liveness and readiness probe.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter
from sqlalchemy import text

from app.api.deps import is_service_ready
from app.api.schemas import HealthResponse
from app.config import get_settings
from app.data.db import get_engine, get_session_factory
from app.data.repository import FxRepository, MacroRepository, ModelRegistryRepository

logger = logging.getLogger(__name__)
router = APIRouter(tags=["ops"])


@router.get("/health", response_model=HealthResponse, summary="Liveness and data readiness probe")
async def health() -> HealthResponse:
    """Return service health, database connectivity, model age, and data freshness."""
    settings = get_settings()
    now_utc = datetime.now(tz=timezone.utc)

    # 1. Database check
    db_status = "ok"
    try:
        engine = get_engine()
        if hasattr(engine, "connect"):
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
        else:
            cur = engine.cursor()
            cur.execute("SELECT 1")
    except Exception as exc:
        logger.warning("DB health check failed: %s", exc)
        db_status = "error"

    # 2. Model status & age
    model_loaded = is_service_ready()
    model_version: str | None = None
    model_age_seconds: float | None = None
    model_age_days: float | None = None

    session_factory = get_session_factory()
    reg_repo = ModelRegistryRepository(session_factory)

    try:
        latest_model = await reg_repo.get_latest_active()
        if latest_model is not None:
            model_version = latest_model.version
            m_dt = latest_model.created_at
            if m_dt.tzinfo is None:
                m_dt = m_dt.replace(tzinfo=timezone.utc)
            model_age_seconds = float((now_utc - m_dt).total_seconds())
            model_age_days = round(model_age_seconds / 86400.0, 2)
    except Exception as exc:
        logger.warning("Could not check model registry: %s", exc)

    # 3. Data freshness per source
    last_data_update: dict[str, str | None] = {}
    stale_flags: dict[str, bool] = {}

    try:
        fx_repo = FxRepository(session_factory)
        latest_fx = await fx_repo.get_latest_tick("USDINR")
        if latest_fx and latest_fx.ts:
            fx_ts = latest_fx.ts if latest_fx.ts.tzinfo else latest_fx.ts.replace(tzinfo=timezone.utc)
            last_data_update["fx"] = fx_ts.isoformat()
            stale_flags["fx"] = (now_utc - fx_ts).total_seconds() > settings.fx_cache_ttl_seconds
        else:
            last_data_update["fx"] = None
            stale_flags["fx"] = True
    except Exception:
        last_data_update["fx"] = None
        stale_flags["fx"] = True

    try:
        macro_repo = MacroRepository(session_factory)
        macro_ts_map = await macro_repo.get_latest_per_series()
        for sid, ts in macro_ts_map.items():
            if ts:
                ts_utc = ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
                last_data_update[sid] = ts_utc.isoformat()
                stale_flags[sid] = (now_utc - ts_utc).total_seconds() > settings.macro_cache_ttl_seconds
            else:
                last_data_update[sid] = None
                stale_flags[sid] = True
    except Exception:
        pass

    # Model staleness (> 7 days)
    stale_flags["model"] = (model_age_days is not None and model_age_days > 7.0) or (not model_loaded)

    # Overall service status
    if not is_service_ready():
        status = "warming_up"
    elif db_status == "ok" and model_loaded:
        status = "ok"
    else:
        status = "degraded"

    return HealthResponse(
        status=status,
        db=db_status,
        model_loaded=model_loaded,
        model_version=model_version,
        model_age_seconds=model_age_seconds,
        model_age_days=model_age_days,
        last_data_update=last_data_update,
        stale_flags=stale_flags,
        timestamp=now_utc,
    )
