"""
tests/test_api.py — Integration tests for FastAPI endpoints, warming-up states,
and audit logging.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import httpx
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.api.deps import set_predictor, set_service_ready
from app.api.main import app
from app.data.db import get_engine, get_session_factory, init_db
from app.data.repository import AuditLogRepository, FxRepository
from app.models.predictor import Predictor


class DummyQuantileModel:
    def __init__(self, val: float):
        self.val = val

    def predict(self, X):
        return np.full(len(X), self.val)


class DummyScaler:
    def transform(self, X):
        return X


def make_dummy_predictor() -> Predictor:
    """Create a lightweight Predictor mock for fast testing."""
    horizons = [1, 3, 5, 10, 15]
    quantiles = [0.05, 0.25, 0.50, 0.75, 0.95]
    models = {
        h: {
            0.05: DummyQuantileModel(-0.02),
            0.25: DummyQuantileModel(-0.005),
            0.50: DummyQuantileModel(0.01),
            0.75: DummyQuantileModel(0.02),
            0.95: DummyQuantileModel(0.04),
        }
        for h in horizons
    }
    scalers = {h: DummyScaler() for h in horizons}
    offsets = {h: 0.002 for h in horizons}
    metadata = {
        "version": "test_dummy_v1",
        "backend": "xgboost",
        "feature_names": ["log_ret_1d"],
        "metrics": {str(h): {"has_edge": True, "model_mae": 0.003} for h in horizons},
    }
    return Predictor(models, scalers, offsets, metadata)


import os
os.environ["APP_ENV"] = "test"

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def setup_test_database():
    """Ensure in-memory SQLite tables are initialized before each test."""
    import asyncio

    async def _setup():
        engine = get_engine()
        await init_db(engine)

        session_factory = get_session_factory(engine)
        fx_repo = FxRepository(session_factory)
        bdays = pd.bdate_range(end="2026-10-30", periods=50, freq="B", tz="UTC")
        df = pd.DataFrame(
            {
                "open": np.linspace(83.0, 84.0, 50),
                "high": np.linspace(83.5, 84.5, 50),
                "low": np.linspace(82.5, 83.5, 50),
                "close": np.linspace(83.0, 84.2, 50),
                "volume": np.full(50, 1000.0),
            },
            index=bdays,
        )
        await fx_repo.upsert(df, "USDINR")

    asyncio.run(_setup())


class TestColdStartWarmup:
    def test_forecast_returns_503_when_warming_up(self, client):
        set_service_ready(False, "Warming up test message")
        resp = client.get("/forecast?horizon=15")
        assert resp.status_code == 503
        data = resp.json()
        assert "Warming up" in data["detail"]

    def test_advice_returns_503_when_warming_up(self, client):
        set_service_ready(False, "Warming up test message")
        resp = client.get("/advice?direction=exporter&amount_usd=100000&horizon=15")
        assert resp.status_code == 503
        data = resp.json()
        assert "Warming up" in data["detail"]

    def test_health_returns_warming_up_status(self, client):
        set_service_ready(False)
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "warming_up"
        assert data["model_loaded"] is False


class TestReadyEndpoints:
    @pytest.fixture(autouse=True)
    def make_ready(self):
        predictor = make_dummy_predictor()
        set_predictor(predictor)
        set_service_ready(True, "Service ready")
        yield
        set_service_ready(False)

    def test_get_forecast(self, client):
        resp = client.get("/forecast?horizon=15")
        assert resp.status_code == 200
        data = resp.json()
        assert data["horizon"] == 15
        assert "dates" in data and len(data["dates"]) > 0
        assert "median" in data and len(data["median"]) > 0
        assert "bands_50" in data and len(data["bands_50"]["lower"]) > 0
        assert "bands_90" in data and len(data["bands_90"]["upper"]) > 0
        assert data["current_rate"] > 0
        assert data["model_version"] == "test_dummy_v1"
        assert "has_edge" in data

    def test_get_advice_exporter(self, client):
        resp = client.get("/advice?direction=exporter&amount_usd=100000&horizon=15")
        assert resp.status_code == 200
        data = resp.json()
        assert data["decision"] in ("LOCK_NOW", "WAIT")
        assert "reason" in data
        assert "reasoning" in data
        assert data["reasoning"]["direction"] == "exporter"
        assert data["reasoning"]["amount_usd"] == 100_000
        assert "expected_range_50" in data["reasoning"]
        assert "expected_range_90" in data["reasoning"]
        assert "gain_to_risk_ratio" in data["reasoning"]

    def test_get_advice_importer(self, client):
        resp = client.get("/advice?direction=importer&amount_usd=50000&horizon=5")
        assert resp.status_code == 200
        data = resp.json()
        assert data["decision"] in ("LOCK_NOW", "WAIT")
        assert data["reasoning"]["direction"] == "importer"
        assert data["reasoning"]["horizon_days"] == 5

    def test_get_health_when_ready(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] in ("ok", "degraded")
        assert data["model_loaded"] is True
        assert data["db"] == "ok"
        assert "last_data_update" in data
        assert "stale_flags" in data

    def test_admin_retrain_unauthorized_without_key(self, client):
        resp = client.post("/admin/retrain")
        assert resp.status_code == 401

    def test_admin_retrain_authorized(self, client, monkeypatch):
        # Mock run_retrain so test runs instantly
        from unittest.mock import AsyncMock
        mock_result = MagicMock()
        mock_result.version = "test_retrained_v2"
        mock_result.train_end_date = "2026-10-31"
        mock_result.n_train = 400
        mock_result.summary.return_value = "TrainResult v=test_retrained_v2 summary"

        monkeypatch.setattr("app.api.routes.admin.run_retrain", AsyncMock(return_value=mock_result))
        monkeypatch.setattr("app.api.routes.admin.load_predictor_from_version", MagicMock())

        headers = {"X-Admin-Key": "tradeshield-admin-secret"}
        resp = client.post("/admin/retrain", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["version"] == "test_retrained_v2"

    def test_audit_log_persists_decisions(self, client):
        """Verify that calling advice logs an entry to audit_log table."""
        import asyncio

        async def _check():
            session_factory = get_session_factory()
            audit_repo = AuditLogRepository(session_factory)

            resp = client.get("/advice?direction=exporter&amount_usd=75000&horizon=10")
            assert resp.status_code == 200

            recent_logs = await audit_repo.get_recent(limit=5)
            assert len(recent_logs) > 0
            advice_logs = [log for log in recent_logs if log.action == "advice"]
            assert len(advice_logs) > 0
            latest = advice_logs[0]
            assert latest.model_version == "test_dummy_v1"
            assert latest.decision in ("LOCK_NOW", "WAIT")

        asyncio.run(_check())
