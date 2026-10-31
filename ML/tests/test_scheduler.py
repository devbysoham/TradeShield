"""
tests/test_scheduler.py — Tests for scheduler job registrations, audit logging,
and model drift/age detection.
"""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.data.db import init_db
from app.data.repository import AuditLogRepository
from app.jobs.scheduler import (
    check_drift_and_age,
    create_scheduler,
    log_audit_event,
)


@pytest.fixture
def anyio_backend():
    return "asyncio"


def test_create_scheduler_registers_required_jobs():
    retrain_mock = MagicMock()
    scheduler = create_scheduler(retrain_callback=retrain_mock)

    assert "refresh_market_data" in scheduler.jobs
    assert "retrain_weekly_sunday" in scheduler.jobs
    assert "check_drift_and_age" in scheduler.jobs


def test_log_audit_event_inserts_row():
    import asyncio

    async def _run():
        await init_db()
        audit_repo = AuditLogRepository()

        await log_audit_event(
            action="advice",
            model_version="test_v1",
            input_data_ts=datetime.now(tz=timezone.utc),
            request_params={"amount": 1000},
            response_data={"decision": "WAIT"},
            decision="WAIT",
        )

        logs = await audit_repo.get_recent(limit=10)
        assert len(logs) > 0
        matched = [l for l in logs if l.action == "advice" and l.decision == "WAIT"]
        assert len(matched) > 0
        assert matched[0].model_version == "test_v1"

    asyncio.run(_run())


def test_check_drift_and_age_no_model():
    import asyncio

    async def _run():
        await init_db()
        retrain_mock = AsyncMock()
        retrained = await check_drift_and_age(retrain_fn=retrain_mock)
        assert retrained is False
        assert retrain_mock.call_count == 0

    asyncio.run(_run())
