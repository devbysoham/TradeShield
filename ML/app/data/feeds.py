"""
app/data/feeds.py — Async HTTP clients for market data feeds.

Design contract
───────────────
* Each feed class exposes an async ``fetch()`` coroutine that returns a
  ``pandas.DataFrame`` with a tz-aware UTC DatetimeIndex.
* If a feed fails for any reason, it logs a WARNING and returns ``None``.
* USD/INR via Alpha Vantage is the primary feed; all others are optional macro enrichment.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod

import httpx
import pandas as pd

from app.config import get_settings

logger = logging.getLogger(__name__)


class BaseFeed(ABC):
    """Abstract base for all market data feeds."""

    @abstractmethod
    async def fetch(self) -> pd.DataFrame | None:
        """Fetch the latest data for this feed."""


class FxFeed(BaseFeed):
    """USD/INR daily OHLCV via Alpha Vantage FX_DAILY endpoint."""

    def __init__(self, api_key: str | None = None, from_symbol: str = "USD", to_symbol: str = "INR") -> None:
        self.api_key = api_key or get_settings().alpha_vantage_key
        self.from_symbol = from_symbol
        self.to_symbol = to_symbol

    async def fetch(self) -> pd.DataFrame | None:
        if not self.api_key or self.api_key in ("DEMO", "TEST_KEY", "YOUR_ALPHA_VANTAGE_KEY"):
            logger.warning("FxFeed: Alpha Vantage key not configured or demo. Skipping live fetch.")
            return None

        url = "https://www.alphavantage.co/query"
        params = {
            "function": "FX_DAILY",
            "from_symbol": self.from_symbol,
            "to_symbol": self.to_symbol,
            "outputsize": "full",
            "apikey": self.api_key,
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()

            ts_key = "Time Series FX (Daily)"
            if ts_key not in data:
                logger.warning("FxFeed: Unexpected response from Alpha Vantage: %s", list(data.keys()))
                return None

            records = []
            for date_str, values in data[ts_key].items():
                records.append(
                    {
                        "ts": pd.to_datetime(date_str, utc=True),
                        "open": float(values["1. open"]),
                        "high": float(values["2. high"]),
                        "low": float(values["3. low"]),
                        "close": float(values["4. close"]),
                        "volume": 0.0,
                    }
                )

            df = pd.DataFrame.from_records(records, index="ts").sort_index()
            return df
        except Exception as exc:
            logger.warning("FxFeed: Failed to fetch FX data: %s", exc)
            return None


class FredFeed(BaseFeed):
    """FRED macro series via FRED REST API (optional)."""

    def __init__(self, series_id: str = "DGS10", api_key: str | None = None) -> None:
        self.series_id = series_id
        self.api_key = api_key or get_settings().fred_api_key

    async def fetch(self) -> pd.DataFrame | None:
        if not self.api_key or self.api_key in ("YOUR_FRED_API_KEY",):
            logger.debug("FredFeed: FRED API key not configured. Skipping.")
            return None

        url = "https://api.stlouisfed.org/fred/series/observations"
        params = {
            "series_id": self.series_id,
            "api_key": self.api_key,
            "file_type": "json",
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()

            obs = data.get("observations", [])
            records = []
            for item in obs:
                val = item.get("value")
                if val and val != ".":
                    records.append(
                        {
                            "ts": pd.to_datetime(item["date"], utc=True),
                            "value": float(val),
                        }
                    )
            if not records:
                return None
            df = pd.DataFrame.from_records(records, index="ts").sort_index()
            return df
        except Exception as exc:
            logger.warning("FredFeed: Failed to fetch series %s: %s", self.series_id, exc)
            return None


class WorldBankFeed(BaseFeed):
    """World Bank macro indicators via public API (optional, no key)."""

    def __init__(self, indicator: str = "NY.GDP.MKTP.KD.ZG", country: str = "IND") -> None:
        self.indicator = indicator
        self.country = country

    async def fetch(self) -> pd.DataFrame | None:
        url = f"https://api.worldbank.org/v2/country/{self.country}/indicator/{self.indicator}?format=json"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()

            if not isinstance(data, list) or len(data) < 2 or not data[1]:
                return None

            records = []
            for item in data[1]:
                val = item.get("value")
                if val is not None:
                    records.append(
                        {
                            "ts": pd.to_datetime(f"{item['date']}-12-31", utc=True),
                            "value": float(val),
                        }
                    )
            if not records:
                return None
            df = pd.DataFrame.from_records(records, index="ts").sort_index()
            return df
        except Exception as exc:
            logger.warning("WorldBankFeed: Failed to fetch indicator %s: %s", self.indicator, exc)
            return None


class CommodityFeed(BaseFeed):
    """Commodity prices via Quandl/Nasdaq Data Link (optional)."""

    def __init__(self, dataset: str = "CHRIS/CME_CL1", api_key: str | None = None) -> None:
        self.dataset = dataset
        self.api_key = api_key or get_settings().quandl_api_key

    async def fetch(self) -> pd.DataFrame | None:
        if not self.api_key or self.api_key in ("YOUR_QUANDL_KEY",):
            logger.debug("CommodityFeed: Quandl API key not configured. Skipping.")
            return None

        url = f"https://data.nasdaq.com/api/v3/datasets/{self.dataset}.json"
        params = {"api_key": self.api_key}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()

            dataset_data = data.get("dataset", {}).get("data", [])
            records = []
            for row in dataset_data:
                # row[0] is Date, row[4] is Settle / Close
                records.append(
                    {
                        "ts": pd.to_datetime(row[0], utc=True),
                        "value": float(row[4] if len(row) > 4 else row[1]),
                    }
                )
            if not records:
                return None
            df = pd.DataFrame.from_records(records, index="ts").sort_index()
            return df
        except Exception as exc:
            logger.warning("CommodityFeed: Failed to fetch %s: %s", self.dataset, exc)
            return None
