"""
app/jobs/retrain_job.py — Weekly model retraining background job and runner.
"""

from __future__ import annotations

import logging
from typing import Any, Callable

import pandas as pd

from app.data.db import get_session_factory
from app.data.repository import AuditLogRepository, FxRepository, MacroRepository, ModelRegistryRepository
from app.jobs.ingest_job import run_ingest
from app.models.train import TrainConfig, train

logger = logging.getLogger(__name__)

_on_model_updated_callback: Callable[[Any], None] | None = None


def set_on_model_updated(callback: Callable[[Any], None]) -> None:
    """Register a callback invoked when a new model is trained."""
    global _on_model_updated_callback
    _on_model_updated_callback = callback


async def fetch_merged_data_from_db() -> pd.DataFrame:
    """Fetch all FX and Macro ticks from DB and merge into a single wide DataFrame."""
    session_factory = get_session_factory()
    fx_repo = FxRepository(session_factory)
    macro_repo = MacroRepository(session_factory)

    fx_df = await fx_repo.read("USDINR")
    if fx_df.empty or len(fx_df) < 100:
        logger.info("Insufficient data in DB for training. Triggering ingest first.")
        await run_ingest(session_factory=session_factory, allow_seed_fallback=True)
        fx_df = await fx_repo.read("USDINR")

    # Fetch macro series
    macro_series_names = ["dxy", "nifty", "brent", "yield_10y"]
    merged = fx_df.copy()

    for sid in macro_series_names:
        m_df = await macro_repo.read(sid)
        if not m_df.empty:
            merged[sid] = m_df["value"]

    return merged


async def run_retrain(cfg: TrainConfig | None = None) -> Any:
    """Pull full data from DB, train models, save to registry table, and update predictor."""
    logger.info("Starting model retrain job …")
    merged_df = await fetch_merged_data_from_db()

    # Train models
    train_res = train(merged_df, cfg=cfg)

    # Persist in model_registry table
    session_factory = get_session_factory()
    reg_repo = ModelRegistryRepository(session_factory)

    metrics_serial = {str(h): vars(m) for h, m in train_res.metrics.items()}
    await reg_repo.save_entry(
        version=train_res.version,
        backend=train_res.config.backend,
        metrics=metrics_serial,
        feature_names=train_res.feature_names,
        artefact_path=str(train_res.artefact_path),
        is_active=True,
    )

    # Log to audit_log
    audit_repo = AuditLogRepository(session_factory)
    await audit_repo.log(
        action="retrain",
        model_version=train_res.version,
        input_data_ts=merged_df.index[-1].to_pydatetime() if len(merged_df) else None,
        response_data={"metrics": metrics_serial, "version": train_res.version},
    )

    # Trigger memory update if callback registered
    if _on_model_updated_callback is not None:
        try:
            _on_model_updated_callback(train_res.version)
        except Exception as exc:
            logger.error("Error updating in-memory predictor: %s", exc)

    logger.info("Retrain completed successfully. Version: %s", train_res.version)
    return train_res
