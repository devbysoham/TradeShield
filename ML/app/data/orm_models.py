"""
app/data/orm_models.py — SQLAlchemy ORM table definitions.

Tables
──────
  FxTick       — raw USD/INR daily OHLCV ticks
  MacroSeries  — generic key/value store for macro indicator observations

Design notes
────────────
* All timestamps stored as TIMESTAMPTZ (UTC) in PostgreSQL.
* A unique constraint on (symbol, ts) prevents duplicate ingestion.
* The ORM models are intentionally thin — business logic lives elsewhere.

TODO: Add Alembic migration support in a follow-up.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Float, String, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""


class FxTick(Base):
    """One calendar-day OHLCV observation for a currency pair."""

    __tablename__ = "fx_tick"
    __table_args__ = (UniqueConstraint("symbol", "ts", name="uq_fx_tick_symbol_ts"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    open: Mapped[float] = mapped_column(Float, nullable=False)
    high: Mapped[float] = mapped_column(Float, nullable=False)
    low: Mapped[float] = mapped_column(Float, nullable=False)
    close: Mapped[float] = mapped_column(Float, nullable=False)
    volume: Mapped[float | None] = mapped_column(Float, nullable=True)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<FxTick symbol={self.symbol!r} ts={self.ts} close={self.close}>"


class MacroSeries(Base):
    """One observation for a named macro indicator series."""

    __tablename__ = "macro_series"
    __table_args__ = (
        UniqueConstraint("series_id", "ts", name="uq_macro_series_id_ts"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    series_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(32), nullable=False)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    value: Mapped[float] = mapped_column(Float, nullable=False)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<MacroSeries id={self.series_id!r} ts={self.ts} value={self.value}>"


class ModelRegistryEntry(Base):
    """Metadata entry in the model registry table."""

    __tablename__ = "model_registry"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    version: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    backend: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    metrics_json: Mapped[str] = mapped_column(String, nullable=False)
    feature_names_json: Mapped[str] = mapped_column(String, nullable=False)
    artefact_path: Mapped[str] = mapped_column(String(256), nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, index=True)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<ModelRegistryEntry version={self.version!r} active={self.is_active}>"


class AuditLog(Base):
    """Audit log for all forecast and advice decisions."""

    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(32), nullable=False, index=True)  # "forecast", "advice", "retrain"
    model_version: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    input_data_ts: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    request_params: Mapped[str | None] = mapped_column(String, nullable=True)
    response_data: Mapped[str | None] = mapped_column(String, nullable=True)
    decision: Mapped[str | None] = mapped_column(String(16), nullable=True)  # "LOCK_NOW", "WAIT"

    def __repr__(self) -> str:  # pragma: no cover
        return f"<AuditLog action={self.action!r} decision={self.decision!r} ts={self.ts}>"
