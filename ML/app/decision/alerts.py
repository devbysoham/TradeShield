"""
app/decision/alerts.py — Threshold-based alert generation for MSME traders.

TODO: Implement ``AlertEngine`` class.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


class AlertSeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


@dataclass
class Alert:
    """A single actionable alert for an exporter or importer."""

    severity: AlertSeverity
    title: str
    body: str
    generated_at: datetime


class AlertEngine:
    """Generates threshold-based alerts from risk assessments.

    TODO: Implement ``generate`` method body.
    """

    def generate(self, risk_assessment, hedge_suggestion=None) -> list[Alert]:
        """Generate alerts for a risk assessment.

        Parameters
        ----------
        risk_assessment:
            ``RiskAssessment`` from ``RiskEngine``.
        hedge_suggestion:
            Optional ``HedgeSuggestion`` to include in alert body.

        Returns
        -------
        list[Alert]
            May be empty if no thresholds are breached.
        """
        # TODO: implement
        raise NotImplementedError
