"""TradeShield ML service — root package."""

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
