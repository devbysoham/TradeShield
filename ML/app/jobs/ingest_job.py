"""
app/jobs/ingest_job.py — Periodic live market data ingestion.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.data.db import get_session_factory
from app.data.feeds import CommodityFeed, FredFeed, FxFeed, WorldBankFeed
from app.data.repository import FxRepository, MacroRepository

logger = logging.getLogger(__name__)


def generate_seed_data(n: int = 500, end_date: str | None = None) -> tuple[pd.DataFrame, dict[str, pd.DataFrame]]:
    """Generate realistic synthetic market data when live external feeds are unavailable."""
    rng = np.random.default_rng(seed=42)
    if end_date is None:
        bdays = pd.bdate_range(end=pd.Timestamp.now(tz="UTC").floor("D"), periods=n, freq="B", tz="UTC")
    else:
        bdays = pd.bdate_range(end=pd.to_datetime(end_date, utc=True), periods=n, freq="B", tz="UTC")

    close = 75.0 * np.cumprod(1 + rng.normal(0.0001, 0.003, n))
    spread = rng.uniform(0.1, 0.3, n)

    fx_df = pd.DataFrame(
        {
            "open": close - spread / 2,
            "high": close + rng.uniform(0.05, 0.4, n),
            "low": close - rng.uniform(0.05, 0.4, n),
            "close": close,
            "volume": rng.uniform(1e6, 5e6, n),
        },
        index=bdays,
    )

    macro_dfs = {
        "dxy": pd.DataFrame({"value": 100.0 * np.cumprod(1 + rng.normal(0, 0.002, n))}, index=bdays),
        "nifty": pd.DataFrame({"value": 18000.0 * np.cumprod(1 + rng.normal(0, 0.004, n))}, index=bdays),
        "brent": pd.DataFrame({"value": 80.0 * np.cumprod(1 + rng.normal(0, 0.006, n))}, index=bdays),
        "yield_10y": pd.DataFrame(
            {"value": np.clip(4.0 + np.cumsum(rng.normal(0, 0.01, n)), 0.5, 12.0)}, index=bdays
        ),
    }

    return fx_df, macro_dfs


async def run_ingest(
    session_factory: async_sessionmaker[AsyncSession] | None = None,
    allow_seed_fallback: bool = True,
) -> int:
    """Fetch all configured feeds and persist new ticks.

    If database has no FX ticks and live feeds return None, generates
    realistic bootstrap data so that the service is immediately functional.
    """
    if session_factory is None:
        session_factory = get_session_factory()

    fx_repo = FxRepository(session_factory)
    macro_repo = MacroRepository(session_factory)

    total_inserted = 0

    # 1. Fetch FX
    fx_feed = FxFeed()
    fx_df = await fx_feed.fetch()
    if fx_df is not None and not fx_df.empty:
        inserted = await fx_repo.upsert(fx_df, symbol="USDINR")
        total_inserted += inserted
    else:
        # Check if database already has ticks
        latest_tick = await fx_repo.get_latest_tick("USDINR")
        if latest_tick is None and allow_seed_fallback:
            logger.info("Database is empty and live FX feed is unavailable. Generating seed data.")
            seed_fx, seed_macro = generate_seed_data()
            inserted = await fx_repo.upsert(seed_fx, symbol="USDINR")
            total_inserted += inserted
            for sid, mdf in seed_macro.items():
                await macro_repo.upsert(mdf, series_id=sid, source="seed")
            return total_inserted

    # 2. Fetch optional macro feeds
    try:
        fred_feed = FredFeed(series_id="DGS10")
        fred_df = await fred_feed.fetch()
        if fred_df is not None:
            await macro_repo.upsert(fred_df, series_id="yield_10y", source="FRED")
    except Exception as exc:
        logger.warning("Failed FRED ingest: %s", exc)

    try:
        oil_feed = CommodityFeed(dataset="CHRIS/CME_CL1")
        oil_df = await oil_feed.fetch()
        if oil_df is not None:
            await macro_repo.upsert(oil_df, series_id="brent", source="Quandl")
    except Exception as exc:
        logger.warning("Failed Commodity ingest: %s", exc)

    return total_inserted
