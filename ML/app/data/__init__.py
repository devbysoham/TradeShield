"""
app/data/__init__.py

Sub-package for all data ingestion, caching and persistence logic.

Modules (to be implemented):
  - feeds.py       — thin async clients for each external API feed
  - cache.py       — DB-backed cache layer (SQLAlchemy + Parquet fallback)
  - models.py      — SQLAlchemy ORM models for raw tick & macro tables
  - repository.py  — CRUD helpers that enforce dedup & time-ordering
"""
