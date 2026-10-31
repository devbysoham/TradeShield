"""
app/features/__init__.py

Sub-package for feature engineering.

Modules
───────
  cleaning.py    — business-day filtering, outlier removal, dedup
  technical.py   — RSI, moving averages, volatility (plain pandas/NumPy only)
  macro.py       — macro feature alignment and masking
  pipeline.py    — orchestrates cleaning → technical → macro into a feature matrix
"""
