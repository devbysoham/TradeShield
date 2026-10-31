"""
app/api/routes/admin.py — Admin privileged endpoints.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends

from app.api.deps import load_predictor_from_version, set_service_ready, verify_admin_key
from app.api.schemas import RetrainResponse
from app.jobs.retrain_job import run_retrain
from app.models.train import TrainConfig

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/retrain", response_model=RetrainResponse, summary="Trigger model retraining")
async def trigger_retrain(
    backend: str = "xgboost",
    authorized: bool = Depends(verify_admin_key),
) -> RetrainResponse:
    """Trigger an immediate model retraining run.

    Pulls fresh market data from DB, runs feature engineering, walk-forward CV,
    CQR calibration, persists versioned artefacts and model registry entry,
    and hot-swaps the active in-memory predictor.
    """
    logger.info("Admin triggered model retrain (backend=%s)", backend)
    cfg = TrainConfig(backend=backend)  # type: ignore[arg-type]
    train_res = await run_retrain(cfg=cfg)

    # Hot-swap predictor
    load_predictor_from_version(train_res.version)
    set_service_ready(True, "Service ready with newly trained model")

    return RetrainResponse(
        status="ok",
        version=train_res.version,
        train_end_date=train_res.train_end_date,
        n_train_samples=train_res.n_train,
        summary=train_res.summary(),
    )
