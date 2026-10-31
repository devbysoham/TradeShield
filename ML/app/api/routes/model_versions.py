"""
app/api/routes/model_versions.py — GET /models endpoint.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter

from app.data.db import get_session_factory
from app.data.repository import ModelRegistryRepository
from app.models.train import list_versions

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/models", tags=["ops"])


@router.get("", summary="List model versions")
async def list_model_versions() -> dict:
    """Return all persisted model version tags, newest first."""
    session_factory = get_session_factory()
    repo = ModelRegistryRepository(session_factory)
    try:
        entries = await repo.list_entries()
        if entries:
            return {
                "versions": [
                    {
                        "version": e.version,
                        "backend": e.backend,
                        "created_at": e.created_at.isoformat() if e.created_at else None,
                        "is_active": e.is_active,
                    }
                    for e in entries
                ]
            }
    except Exception:
        pass

    # Fallback to filesystem
    versions = list_versions()
    return {"versions": [{"version": v} for v in versions]}
