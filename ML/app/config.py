"""
app/config.py — centralised configuration for TradeShield ML service.

All values are loaded from environment variables (or .env via python-dotenv).
No hard-coded secrets or data paths live here.
"""

from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment / .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Database ─────────────────────────────────────────────────────────────
    database_url: str = Field(
        default="sqlite+aiosqlite:///./tradeshield.db",
        description="Async SQLAlchemy connection URL for PostgreSQL or SQLite.",
    )

    # ── API Keys ─────────────────────────────────────────────────────────────
    alpha_vantage_key: str = Field(
        default="DEMO",
        description="Alpha Vantage API key (required — USD/INR primary source).",
    )
    fred_api_key: str | None = Field(
        default=None,
        description="FRED API key for US macro indicators (optional).",
    )
    quandl_api_key: str | None = Field(
        default=None,
        description="Quandl/Nasdaq Data Link key for commodity prices (optional).",
    )
    admin_api_key: str = Field(
        default="tradeshield-admin-secret",
        description="Admin API secret key for triggering retrain.",
    )

    # ── Decision / Advice ─────────────────────────────────────────────────────
    advice_gain_risk_threshold: float = Field(
        default=0.5,
        ge=0.0,
        description="Threshold for expected_gain / downside_risk to recommend WAIT.",
    )
    annual_forward_premium_pct: float = Field(
        default=2.5,
        description="Annualized forward premium % for USD/INR forward rate estimation.",
    )
    error_drift_threshold: float = Field(
        default=0.03,
        description="Forecast MAE drift threshold triggering automated retraining.",
    )

    # ── Cache ─────────────────────────────────────────────────────────────────
    fx_cache_ttl_seconds: int = Field(
        default=300,
        description="Seconds before FX tick cache is considered stale.",
    )
    macro_cache_ttl_seconds: int = Field(
        default=3600,
        description="Seconds before macro indicator cache is considered stale.",
    )
    parquet_cache_dir: Path = Field(
        default=Path(".cache/parquet"),
        description="Local Parquet cache directory (must be git-ignored).",
    )

    # ── Forecast ──────────────────────────────────────────────────────────────
    forecast_horizon_days: int = Field(
        default=15,
        ge=1,
        le=90,
        description="Number of business days to forecast ahead.",
    )
    prediction_interval_lower: float = Field(
        default=0.10,
        ge=0.01,
        le=0.49,
        description="Lower quantile for the forecast interval.",
    )
    prediction_interval_upper: float = Field(
        default=0.90,
        ge=0.51,
        le=0.99,
        description="Upper quantile for the forecast interval.",
    )

    # ── Data quality ─────────────────────────────────────────────────────────
    outlier_sigma_threshold: float = Field(
        default=5.0,
        description="Daily return moves beyond this many sigma are dropped.",
    )

    # ── Scheduler ─────────────────────────────────────────────────────────────
    scheduler_retrain_cron: str = Field(
        default="0 2 * * 1",
        description="Cron expression for weekly model retraining (UTC).",
    )
    scheduler_ingest_cron: str = Field(
        default="*/15 * * * *",
        description="Cron expression for live data ingestion.",
    )

    # ── App ───────────────────────────────────────────────────────────────────
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO",
        description="Root logging level.",
    )
    app_env: Literal["development", "staging", "production", "test"] = Field(
        default="development",
        description="Deployment environment.",
    )

    @field_validator("parquet_cache_dir", mode="before")
    @classmethod
    def _resolve_cache_dir(cls, v: str | Path) -> Path:
        """Resolve and create the Parquet cache directory if absent."""
        path = Path(v)
        try:
            path.mkdir(parents=True, exist_ok=True)
        except (OSError, PermissionError):
            pass
        return path


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached singleton Settings instance."""
    settings = Settings()  # type: ignore[call-arg]
    logging.basicConfig(level=settings.log_level)
    return settings
