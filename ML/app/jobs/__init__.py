"""
app/jobs/__init__.py

Sub-package for APScheduler background jobs.

Modules
───────
  scheduler.py   — APScheduler setup, job registration and graceful shutdown
  ingest_job.py  — Periodic live data ingestion job (every 15 min)
  retrain_job.py — Weekly model retraining job (Monday 02:00 UTC)
"""
