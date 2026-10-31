"""
app/models/__init__.py

Sub-package for ML model training, calibration, persistence and inference.

Modules
───────
  trainer.py     — XGBoost quantile regressors for lower/upper bounds + point
  calibration.py — Isotonic regression calibration of interval coverage
  registry.py    — Save / load model artefacts (joblib, versioned)
  predictor.py   — Inference wrapper that returns calibrated 15-day ranges
"""
