"""
app/api/main.py — FastAPI application factory and entrypoint.
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.deps import (
    is_service_ready,
    load_predictor_from_version,
    set_service_ready,
)
from app.api.routes import admin, advice, forecast, health, model_versions
from app.config import get_settings
from app.data.db import init_db
from app.jobs.ingest_job import run_ingest
from app.jobs.retrain_job import run_retrain, set_on_model_updated
from app.jobs.scheduler import create_scheduler, get_global_scheduler
from app.models.train import latest_version

logger = logging.getLogger(__name__)


async def initial_warmup() -> None:
    """Background task for cold starts on an empty database."""
    try:
        logger.info("Cold start detected: running initial ingestion and model training in background...")
        set_service_ready(
            False,
            "Service is warming up: initializing database, ingesting market data, and training model. Please try again shortly.",
        )

        # 1. Ingest market data (with seed fallback if external feeds are unavailable)
        await run_ingest(allow_seed_fallback=True)

        # 2. Run initial training
        train_res = await run_retrain()

        # 3. Load newly trained model
        load_predictor_from_version(train_res.version)

        # 4. Start background scheduler
        scheduler = get_global_scheduler()
        if not scheduler.running:
            scheduler.start()

        # 5. Mark service ready
        set_service_ready(True, "Service ready")
        logger.info("Initial warmup complete. TradeShield ML service is ready to serve predictions!")
    except Exception as exc:
        logger.error("Initial background warmup failed: %s", exc, exc_info=True)
        set_service_ready(False, f"Initial warmup failed: {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for startup and shutdown."""
    settings = get_settings()
    logger.info("TradeShield ML service starting (env=%s)...", settings.app_env)

    # 1. Initialize database tables
    try:
        await init_db()
    except Exception as exc:
        logger.error("Database initialization failed: %s", exc)

    # 2. Wire up model update callbacks
    set_on_model_updated(lambda version: load_predictor_from_version(version))

    # 3. Check for existing trained model
    from app.models.train import _DEFAULT_ARTEFACT_DIR
    active_version = latest_version(_DEFAULT_ARTEFACT_DIR)

    if active_version:
        logger.info("Found existing model version: %s. Loading...", active_version)
        pred = load_predictor_from_version(active_version)
        if pred is not None:
            set_service_ready(True, "Service ready")
            scheduler = get_global_scheduler()
            if not scheduler.running:
                scheduler.start()

    # 4. If no model is ready, trigger cold-start warmup in background (skip in test / pytest)
    is_pytest = "pytest" in sys.modules or "PYTEST_CURRENT_TEST" in os.environ
    if not is_service_ready() and settings.app_env != "test" and not is_pytest:
        asyncio.create_task(initial_warmup())

    yield

    # 5. Graceful shutdown
    logger.info("TradeShield ML service shutting down...")
    scheduler = get_global_scheduler()
    if scheduler.running:
        scheduler.shutdown(wait=False)


def create_app() -> FastAPI:
    """Construct and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="TradeShield ML Service",
        description=(
            "Calibrated multi-horizon USD/INR FX range forecasts "
            "with transparent risk intelligence for MSME exporters and importers."
        ),
        version="0.2.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.app_env != "production" else None,
        redoc_url="/redoc" if settings.app_env != "production" else None,
    )

    # Register API routers
    app.include_router(health.router)
    app.include_router(forecast.router)
    app.include_router(advice.router)
    app.include_router(admin.router)
    app.include_router(model_versions.router)

    return app


app = create_app()
