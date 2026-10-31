"""
app/data/cache.py — Two-tier cache: PostgreSQL (primary) + Parquet (fallback).

Responsibilities
────────────────
* Check whether a feed's data is fresh (within its configured TTL).
* If stale, trigger a live fetch and persist the result.
* Provide a read interface that always returns a tz-aware UTC DataFrame or None.
* Write Parquet snapshots to the git-ignored local cache dir as a cold-start
  fallback when the database is unavailable.

TODO: Implement CacheManager class body in the next iteration.
"""

from __future__ import annotations

import logging

import pandas as pd

logger = logging.getLogger(__name__)


class CacheManager:
    """Manages read-through caching for all market data feeds.

    Parameters
    ----------
    session_factory:
        Async SQLAlchemy session factory.
    parquet_dir:
        Path to the local Parquet cache directory.
    """

    def __init__(self, session_factory, parquet_dir) -> None:  # type: ignore[type-arg]
        # TODO: store session_factory and parquet_dir
        raise NotImplementedError

    async def get_fx(self, symbol: str) -> pd.DataFrame | None:
        """Return cached USD/INR data, refreshing if stale.

        Parameters
        ----------
        symbol:
            Currency pair identifier, e.g. ``"USDINR"``.

        Returns
        -------
        pandas.DataFrame or None
        """
        # TODO: implement
        raise NotImplementedError

    async def get_macro(self, series_id: str) -> pd.DataFrame | None:
        """Return cached macro series, refreshing if stale.

        Parameters
        ----------
        series_id:
            FRED / World Bank series identifier.

        Returns
        -------
        pandas.DataFrame or None
        """
        # TODO: implement
        raise NotImplementedError
