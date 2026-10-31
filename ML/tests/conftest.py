"""
tests/conftest.py — Shared pytest fixtures for TradeShield ML tests.

Fixtures
────────
  settings         — in-memory Settings with test overrides
  sample_fx_df     — synthetic (not hard-coded) OHLCV DataFrame for unit tests
"""

from __future__ import annotations

import os
import sys

if sys.platform == "win32":
    try:
        import socket
        _s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        _s.bind(("127.0.0.1", 0))
        _s.listen(1)
        _port = _s.getsockname()[1]
        _c = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        _c.settimeout(0.05)
        _c.connect(("127.0.0.1", _port))
        _s.close()
        _c.close()
    except Exception:
        import signal
        import unittest.mock
        from asyncio.proactor_events import BaseProactorEventLoop
        from asyncio.windows_events import _overlapped

        signal.set_wakeup_fd = unittest.mock.MagicMock()
        _ov = _overlapped.Overlapped()

        class _DummySock:
            def fileno(self) -> int:
                return -1

            def setblocking(self, b: bool) -> None:
                pass

            def close(self) -> None:
                pass

        def _dummy_make_self_pipe(self):
            self._ssock = _DummySock()
            self._csock = _DummySock()
            self._internal_fds += 1

        def _dummy_write_to_self(self):
            if hasattr(self, "_proactor") and hasattr(self._proactor, "_iocp"):
                try:
                    _overlapped.PostQueuedCompletionStatus(self._proactor._iocp, 0, 0, _ov.address)
                except OSError:
                    pass

        BaseProactorEventLoop._make_self_pipe = _dummy_make_self_pipe
        BaseProactorEventLoop._close_self_pipe = unittest.mock.MagicMock()
        BaseProactorEventLoop._write_to_self = _dummy_write_to_self
        BaseProactorEventLoop._loop_self_reading = unittest.mock.MagicMock()

import numpy as np
import pandas as pd
import pytest

from app.config import Settings


@pytest.fixture
def settings(monkeypatch) -> Settings:
    """Return a Settings instance with test-safe overrides."""
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test_db")
    monkeypatch.setenv("ALPHA_VANTAGE_KEY", "TEST_KEY")
    # Clear the lru_cache so the monkeypatched env is picked up
    from app.config import get_settings
    get_settings.cache_clear()
    return get_settings()


@pytest.fixture
def sample_fx_df() -> pd.DataFrame:
    """Generate a synthetic 500-day OHLCV DataFrame for unit tests.

    Data is procedurally generated — no static files are committed.
    """
    rng = np.random.default_rng(seed=42)
    n = 500
    bdays = pd.bdate_range(start="2022-01-03", periods=n, freq="B", tz="UTC")

    close = 75.0 * np.cumprod(1 + rng.normal(0, 0.003, n))
    spread = rng.uniform(0.1, 0.4, n)

    return pd.DataFrame(
        {
            "open":   close - spread / 2,
            "high":   close + rng.uniform(0.0, 0.5, n),
            "low":    close - rng.uniform(0.0, 0.5, n),
            "close":  close,
            "volume": rng.uniform(1e6, 5e6, n),
        },
        index=bdays,
    )
