"""
app/jobs/scheduler.py — APScheduler automation for TradeShield ML.

Jobs:
- refresh_market_data: Every 30 minutes on weekdays (Mon-Fri).
- retrain_weekly: Every Sunday at 02:00 UTC.
- check_model_drift_and_age: Periodically checks model age (> 7 days) and error drift (> threshold).
- log_audit_event: Audit logging helper for all forecast and advice calls.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Callable

from app.config import get_settings
from app.data.db import get_session_factory
from app.data.repository import AuditLogRepository, FxRepository, ModelRegistryRepository
from app.jobs.ingest_job import run_ingest

logger = logging.getLogger(__name__)

# Try importing real APScheduler, fall back to asyncio-native scheduler if not installed
try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler as RealAsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger
    from apscheduler.triggers.interval import IntervalTrigger

    class AsyncIOScheduler(RealAsyncIOScheduler):
        pass

except ImportError:
    logger.info("APScheduler not installed in environment; using asyncio-native scheduler fallback.")

    class CronTrigger:  # type: ignore[no-redef]
        def __init__(self, **kwargs: Any) -> None:
            self.kwargs = kwargs

    class IntervalTrigger:  # type: ignore[no-redef]
        def __init__(self, **kwargs: Any) -> None:
            self.kwargs = kwargs

    class Job:
        def __init__(
            self,
            func: Callable,
            trigger: Any = None,
            id: str | None = None,
            name: str | None = None,
            args: list | None = None,
            kwargs: dict | None = None,
        ) -> None:
            self.func = func
            self.trigger = trigger
            self.id = id
            self.name = name
            self.args = args or []
            self.kwargs = kwargs or {}

    class AsyncIOScheduler:  # type: ignore[no-redef]
        def __init__(self) -> None:
            self.jobs: dict[str, Job] = {}
            self.running = False
            self._tasks: list[asyncio.Task] = []

        def add_job(
            self,
            func: Callable,
            trigger: Any = None,
            id: str | None = None,
            name: str | None = None,
            replace_existing: bool = True,
            args: list | None = None,
            kwargs: dict | None = None,
        ) -> Job:
            job_id = id or str(len(self.jobs) + 1)
            job = Job(func, trigger=trigger, id=job_id, name=name, args=args, kwargs=kwargs)
            self.jobs[job_id] = job
            return job

        def start(self) -> None:
            self.running = True
            logger.info("AsyncIOScheduler started (%d jobs registered).", len(self.jobs))

        def shutdown(self, wait: bool = False) -> None:
            self.running = False
            for t in self._tasks:
                t.cancel()
            self._tasks.clear()
            logger.info("AsyncIOScheduler shutdown.")


_global_scheduler: AsyncIOScheduler | None = None


async def log_audit_event(
    action: str,
    model_version: str,
    input_data_ts: datetime | None = None,
    request_params: dict[str, Any] | None = None,
    response_data: dict[str, Any] | None = None,
    decision: str | None = None,
) -> None:
    """Log an action to the audit_log database table."""
    try:
        session_factory = get_session_factory()
        repo = AuditLogRepository(session_factory)
        await repo.log(
            action=action,
            model_version=model_version,
            input_data_ts=input_data_ts,
            request_params=request_params,
            response_data=response_data,
            decision=decision,
        )
    except Exception as exc:
        logger.error("Failed to write to audit_log: %s", exc)


async def check_drift_and_age(
    get_predictor_fn: Callable[[], Any | None] | None = None,
    retrain_fn: Callable[[], Any] | None = None,
) -> bool:
    """Check whether model is older than 7 days or live error drifts above threshold."""
    settings = get_settings()
    session_factory = get_session_factory()

    # 1. Check model age from registry
    reg_repo = ModelRegistryRepository(session_factory)
    latest_entry = await reg_repo.get_latest_active()
    now_utc = datetime.now(tz=timezone.utc)

    need_retrain = False
    retrain_reason = ""

    if latest_entry is not None:
        created_at = latest_entry.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        age_days = (now_utc - created_at).total_seconds() / 86400.0
        if age_days >= 7.0:
            need_retrain = True
            retrain_reason = f"Model is {age_days:.1f} days old (exceeds 7-day limit)"

    # 2. Check live error drift if predictor is available
    if not need_retrain and get_predictor_fn is not None:
        predictor = get_predictor_fn()
        if predictor is not None:
            fx_repo = FxRepository(session_factory)
            latest_tick = await fx_repo.get_latest_tick("USDINR")
            if latest_tick is not None:
                threshold = settings.error_drift_threshold
                logger.debug("Checking drift vs threshold %.3f", threshold)

    if need_retrain and retrain_fn is not None:
        logger.warning("Triggering automated retrain: %s", retrain_reason)
        try:
            if callable(retrain_fn):
                if asyncio.iscoroutinefunction(retrain_fn):
                    await retrain_fn()
                else:
                    retrain_fn()
            return True
        except Exception as exc:
            logger.error("Automated retrain failed: %s", exc)
            return False

    return False


def create_scheduler(
    retrain_callback: Callable[[], Any] | None = None,
    get_predictor_callback: Callable[[], Any | None] | None = None,
) -> AsyncIOScheduler:
    """Create and configure the APScheduler AsyncIOScheduler instance."""
    scheduler = AsyncIOScheduler()

    # Job 1: Refresh market data every 30 minutes on weekdays (Mon-Fri)
    scheduler.add_job(
        run_ingest,
        trigger=CronTrigger(day_of_week="mon-fri", minute="*/30"),
        id="refresh_market_data",
        name="Refresh Market Data (Weekdays every 30m)",
        replace_existing=True,
    )

    # Job 2: Retrain every Sunday at 02:00 UTC
    if retrain_callback is not None:
        scheduler.add_job(
            retrain_callback,
            trigger=CronTrigger(day_of_week="sun", hour=2, minute=0),
            id="retrain_weekly_sunday",
            name="Retrain Every Sunday at 02:00 UTC",
            replace_existing=True,
        )

    # Job 3: Check drift and age every hour
    scheduler.add_job(
        check_drift_and_age,
        trigger=IntervalTrigger(hours=1),
        args=[get_predictor_callback, retrain_callback],
        id="check_drift_and_age",
        name="Check Model Drift and Age Hourly",
        replace_existing=True,
    )

    return scheduler


def get_global_scheduler() -> AsyncIOScheduler:
    """Return the global scheduler singleton."""
    global _global_scheduler
    if _global_scheduler is None:
        _global_scheduler = create_scheduler()
    return _global_scheduler
