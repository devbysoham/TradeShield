"""
app/data/db.py — Database connectivity and session lifecycle.
"""

from __future__ import annotations

import logging
import sqlite3
from collections.abc import AsyncGenerator
from typing import Any

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)

_sqlite_conn: sqlite3.Connection | None = None
_engine: Any = None
_session_factory: Any = None


def get_sqlite_connection() -> sqlite3.Connection:
    """Return a thread-safe in-memory SQLite connection for local/test use."""
    global _sqlite_conn
    if _sqlite_conn is None:
        _sqlite_conn = sqlite3.connect(":memory:", check_same_thread=False)
        _sqlite_conn.row_factory = sqlite3.Row
    return _sqlite_conn


def get_engine(settings: Settings | None = None) -> Any:
    """Return the global SQLAlchemy engine or SQLite connection."""
    global _engine
    if settings is None:
        settings = get_settings()

    if settings.database_url.startswith("postgresql") and not settings.database_url.endswith("test_db"):
        if _engine is None:
            from sqlalchemy.ext.asyncio import create_async_engine
            _engine = create_async_engine(settings.database_url, echo=False, future=True)
        return _engine
    return get_sqlite_connection()


def get_session_factory(engine: Any = None) -> Any:
    """Return session factory or sqlite connection."""
    global _session_factory
    settings = get_settings()
    if settings.database_url.startswith("postgresql") and not settings.database_url.endswith("test_db"):
        if _session_factory is None:
            from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
            eng = engine or get_engine(settings)
            _session_factory = async_sessionmaker(
                bind=eng,
                class_=AsyncSession,
                expire_on_commit=False,
                autoflush=False,
            )
        return _session_factory
    return get_sqlite_connection()


async def init_db(engine: Any = None) -> None:
    """Create all required tables in SQLite."""
    con = get_sqlite_connection()
    cur = con.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS fx_tick (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            ts TEXT NOT NULL,
            open REAL NOT NULL,
            high REAL NOT NULL,
            low REAL NOT NULL,
            close REAL NOT NULL,
            volume REAL,
            UNIQUE(symbol, ts)
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS macro_series (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            series_id TEXT NOT NULL,
            source TEXT NOT NULL,
            ts TEXT NOT NULL,
            value REAL NOT NULL,
            UNIQUE(series_id, ts)
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS model_registry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version TEXT NOT NULL UNIQUE,
            backend TEXT NOT NULL,
            created_at TEXT NOT NULL,
            metrics_json TEXT NOT NULL,
            feature_names_json TEXT NOT NULL,
            artefact_path TEXT NOT NULL,
            is_active INTEGER DEFAULT 1
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts TEXT NOT NULL,
            action TEXT NOT NULL,
            model_version TEXT NOT NULL,
            input_data_ts TEXT,
            request_params TEXT,
            response_data TEXT,
            decision TEXT
        )
        """
    )
    con.commit()
    logger.info("Database tables initialized successfully.")


async def get_db_session() -> AsyncGenerator[Any, None]:
    """FastAPI dependency yielding a database session."""
    yield get_sqlite_connection()
