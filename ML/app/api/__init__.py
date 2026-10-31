"""
app/api/__init__.py

Sub-package for FastAPI route definitions.

Modules
───────
  main.py      — FastAPI application factory and lifespan context
  routes/
    forecast.py  — POST /forecast endpoint
    health.py    — GET /health liveness probe
    models.py    — GET /models endpoint (list model versions)
  schemas.py   — Pydantic request / response schemas
  deps.py      — FastAPI dependency injection (DB session, predictor, etc.)
"""
