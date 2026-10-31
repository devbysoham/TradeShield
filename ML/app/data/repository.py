"""
app/data/repository.py — Database CRUD helpers for FX ticks, macro series,
model registry entries, and audit logs.
"""

from __future__ import annotations

import json
import logging
import sqlite3
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import numpy as np
import pandas as pd

from app.data.db import get_sqlite_connection

logger = logging.getLogger(__name__)

_db_lock = threading.Lock()


@dataclass
class FxTickRecord:
    symbol: str
    ts: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float | None = None


@dataclass
class ModelRegistryRecord:
    version: str
    backend: str
    created_at: datetime
    metrics_json: str
    feature_names_json: str
    artefact_path: str
    is_active: bool = True


@dataclass
class AuditLogRecord:
    id: int
    ts: datetime
    action: str
    model_version: str
    input_data_ts: datetime | None
    request_params: str | None
    response_data: str | None
    decision: str | None


class FxRepository:
    """Persistence helpers for FX ticks."""

    def __init__(self, session_factory: Any = None) -> None:
        self.session_factory = session_factory

    async def upsert(self, df: pd.DataFrame, symbol: str = "USDINR") -> int:
        """Persist new FX ticks, skipping duplicates."""
        if df.empty:
            return 0

        inserted = 0
        with _db_lock:
            con = get_sqlite_connection()
            cur = con.cursor()
            for ts, row in df.iterrows():
                ts_str = pd.to_datetime(ts, utc=True).isoformat()
                vol = row.get("volume")
                vol_val = float(vol) if vol is not None and not np.isnan(vol) else None
                try:
                    cur.execute(
                        """
                        INSERT OR IGNORE INTO fx_tick (symbol, ts, open, high, low, close, volume)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            symbol,
                            ts_str,
                            float(row.get("open", row["close"])),
                            float(row.get("high", row["close"])),
                            float(row.get("low", row["close"])),
                            float(row["close"]),
                            vol_val,
                        ),
                    )
                    if cur.rowcount > 0:
                        inserted += 1
                except Exception as exc:
                    logger.debug("Insert error: %s", exc)

            con.commit()
        return inserted

    async def read(
        self,
        symbol: str = "USDINR",
        start: str | datetime | None = None,
        end: str | datetime | None = None,
    ) -> pd.DataFrame:
        """Read FX ticks time-ordered ascending as a DataFrame with UTC DatetimeIndex."""
        query = "SELECT ts, open, high, low, close, volume FROM fx_tick WHERE symbol = ?"
        params: list[Any] = [symbol]

        if start is not None:
            query += " AND ts >= ?"
            params.append(pd.to_datetime(start, utc=True).isoformat())
        if end is not None:
            query += " AND ts <= ?"
            params.append(pd.to_datetime(end, utc=True).isoformat())

        query += " ORDER BY ts ASC"

        with _db_lock:
            con = get_sqlite_connection()
            cur = con.cursor()
            cur.execute(query, params)
            rows = cur.fetchall()

        if not rows:
            return pd.DataFrame(columns=["open", "high", "low", "close", "volume"])

        records = [
            {
                "ts": r["ts"],
                "open": r["open"],
                "high": r["high"],
                "low": r["low"],
                "close": r["close"],
                "volume": r["volume"],
            }
            for r in rows
        ]
        df = pd.DataFrame.from_records(records, index="ts")
        df.index = pd.to_datetime(df.index, utc=True)
        return df

    async def get_latest_tick(self, symbol: str = "USDINR") -> FxTickRecord | None:
        """Fetch the most recent tick for the given symbol."""
        with _db_lock:
            con = get_sqlite_connection()
            cur = con.cursor()
            cur.execute("SELECT * FROM fx_tick WHERE symbol = ? ORDER BY ts DESC LIMIT 1", (symbol,))
            row = cur.fetchone()

        if not row:
            return None
        return FxTickRecord(
            symbol=row["symbol"],
            ts=pd.to_datetime(row["ts"], utc=True).to_pydatetime(),
            open=row["open"],
            high=row["high"],
            low=row["low"],
            close=row["close"],
            volume=row["volume"],
        )


class MacroRepository:
    """Persistence helpers for macro indicator series."""

    def __init__(self, session_factory: Any = None) -> None:
        self.session_factory = session_factory

    async def upsert(self, df: pd.DataFrame, series_id: str, source: str) -> int:
        """Persist macro observations, skipping duplicates."""
        if df.empty:
            return 0

        inserted = 0
        with _db_lock:
            con = get_sqlite_connection()
            cur = con.cursor()
            for ts, row in df.iterrows():
                ts_str = pd.to_datetime(ts, utc=True).isoformat()
                val = float(row.get("value", row.iloc[0]))
                try:
                    cur.execute(
                        """
                        INSERT OR IGNORE INTO macro_series (series_id, source, ts, value)
                        VALUES (?, ?, ?, ?)
                        """,
                        (series_id, source, ts_str, val),
                    )
                    if cur.rowcount > 0:
                        inserted += 1
                except Exception as exc:
                    logger.debug("Macro insert error: %s", exc)

            con.commit()
        return inserted

    async def read(
        self,
        series_id: str,
        start: str | datetime | None = None,
        end: str | datetime | None = None,
    ) -> pd.DataFrame:
        """Read macro observations time-ordered ascending."""
        query = "SELECT ts, value FROM macro_series WHERE series_id = ?"
        params: list[Any] = [series_id]

        if start is not None:
            query += " AND ts >= ?"
            params.append(pd.to_datetime(start, utc=True).isoformat())
        if end is not None:
            query += " AND ts <= ?"
            params.append(pd.to_datetime(end, utc=True).isoformat())

        query += " ORDER BY ts ASC"

        with _db_lock:
            con = get_sqlite_connection()
            cur = con.cursor()
            cur.execute(query, params)
            rows = cur.fetchall()

        if not rows:
            return pd.DataFrame(columns=["value"])

        records = [{"ts": r["ts"], "value": r["value"]} for r in rows]
        df = pd.DataFrame.from_records(records, index="ts")
        df.index = pd.to_datetime(df.index, utc=True)
        return df

    async def get_latest_per_series(self) -> dict[str, datetime | None]:
        """Return a mapping of series_id to its latest observation timestamp."""
        with _db_lock:
            con = get_sqlite_connection()
            cur = con.cursor()
            cur.execute("SELECT DISTINCT series_id FROM macro_series")
            series_ids = [r[0] for r in cur.fetchall()]

            latest_map: dict[str, datetime | None] = {}
            for sid in series_ids:
                cur.execute("SELECT ts FROM macro_series WHERE series_id = ? ORDER BY ts DESC LIMIT 1", (sid,))
                row = cur.fetchone()
                if row:
                    latest_map[sid] = pd.to_datetime(row["ts"], utc=True).to_pydatetime()
                else:
                    latest_map[sid] = None

        return latest_map


class ModelRegistryRepository:
    """Persistence helpers for model registry entries."""

    def __init__(self, session_factory: Any = None) -> None:
        self.session_factory = session_factory

    async def save_entry(
        self,
        version: str,
        backend: str,
        metrics: dict[str, Any],
        feature_names: list[str],
        artefact_path: str,
        is_active: bool = True,
    ) -> ModelRegistryRecord:
        """Record a newly trained model version."""
        with _db_lock:
            con = get_sqlite_connection()
            cur = con.cursor()
            if is_active:
                cur.execute("UPDATE model_registry SET is_active = 0")

            now_str = datetime.now(tz=timezone.utc).isoformat()
            cur.execute(
                """
                INSERT OR REPLACE INTO model_registry
                (version, backend, created_at, metrics_json, feature_names_json, artefact_path, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    version,
                    backend,
                    now_str,
                    json.dumps(metrics),
                    json.dumps(feature_names),
                    str(artefact_path),
                    1 if is_active else 0,
                ),
            )
            con.commit()

        return ModelRegistryRecord(
            version=version,
            backend=backend,
            created_at=datetime.now(tz=timezone.utc),
            metrics_json=json.dumps(metrics),
            feature_names_json=json.dumps(feature_names),
            artefact_path=str(artefact_path),
            is_active=is_active,
        )

    async def get_latest_active(self) -> ModelRegistryRecord | None:
        """Fetch the current active model registry entry."""
        with _db_lock:
            con = get_sqlite_connection()
            cur = con.cursor()
            cur.execute(
                "SELECT * FROM model_registry WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1"
            )
            row = cur.fetchone()

        if not row:
            return None
        return ModelRegistryRecord(
            version=row["version"],
            backend=row["backend"],
            created_at=pd.to_datetime(row["created_at"], utc=True).to_pydatetime(),
            metrics_json=row["metrics_json"],
            feature_names_json=row["feature_names_json"],
            artefact_path=row["artefact_path"],
            is_active=bool(row["is_active"]),
        )

    async def list_entries(self) -> list[ModelRegistryRecord]:
        """Fetch all registry entries, newest first."""
        with _db_lock:
            con = get_sqlite_connection()
            cur = con.cursor()
            cur.execute("SELECT * FROM model_registry ORDER BY created_at DESC")
            rows = cur.fetchall()

        return [
            ModelRegistryRecord(
                version=r["version"],
                backend=r["backend"],
                created_at=pd.to_datetime(r["created_at"], utc=True).to_pydatetime(),
                metrics_json=r["metrics_json"],
                feature_names_json=r["feature_names_json"],
                artefact_path=r["artefact_path"],
                is_active=bool(r["is_active"]),
            )
            for r in rows
        ]


class AuditLogRepository:
    """Persistence helpers for audit logs."""

    def __init__(self, session_factory: Any = None) -> None:
        self.session_factory = session_factory

    async def log(
        self,
        action: str,
        model_version: str,
        input_data_ts: datetime | None = None,
        request_params: dict[str, Any] | None = None,
        response_data: dict[str, Any] | None = None,
        decision: str | None = None,
    ) -> AuditLogRecord:
        """Record an action (forecast, advice, retrain) in the audit log."""
        now_str = datetime.now(tz=timezone.utc).isoformat()
        input_ts_str = input_data_ts.isoformat() if input_data_ts else None

        with _db_lock:
            con = get_sqlite_connection()
            cur = con.cursor()
            cur.execute(
                """
                INSERT INTO audit_log (ts, action, model_version, input_data_ts, request_params, response_data, decision)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    now_str,
                    action,
                    model_version,
                    input_ts_str,
                    json.dumps(request_params) if request_params else None,
                    json.dumps(response_data) if response_data else None,
                    decision,
                ),
            )
            con.commit()
            last_id = cur.lastrowid or 0

        return AuditLogRecord(
            id=last_id,
            ts=datetime.now(tz=timezone.utc),
            action=action,
            model_version=model_version,
            input_data_ts=input_data_ts,
            request_params=json.dumps(request_params) if request_params else None,
            response_data=json.dumps(response_data) if response_data else None,
            decision=decision,
        )

    async def get_recent(self, limit: int = 50) -> list[AuditLogRecord]:
        """Return the most recent audit log entries."""
        with _db_lock:
            con = get_sqlite_connection()
            cur = con.cursor()
            cur.execute("SELECT * FROM audit_log ORDER BY ts DESC LIMIT ?", (limit,))
            rows = cur.fetchall()

        return [
            AuditLogRecord(
                id=r["id"],
                ts=pd.to_datetime(r["ts"], utc=True).to_pydatetime(),
                action=r["action"],
                model_version=r["model_version"],
                input_data_ts=pd.to_datetime(r["input_data_ts"], utc=True).to_pydatetime() if r["input_data_ts"] else None,
                request_params=r["request_params"],
                response_data=r["response_data"],
                decision=r["decision"],
            )
            for r in rows
        ]
