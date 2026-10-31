"""
app/decision/advisor.py — Transparent, rule-based FX hedging advisor.

Decision rule (transparent, no ML black box)
─────────────────────────────────────────────
* expected_gain:
    Expected favorable move in INR per USD over the horizon
    (from the median forecast vs. the current forward-adjusted rate).
    - Exporter (wants higher USD/INR): max(0.0, median_forecast - forward_rate)
    - Importer (wants lower USD/INR): max(0.0, forward_rate - median_forecast)

* downside_risk:
    Distance from current rate to the 5th/95th quantile on the adverse side.
    - Exporter: distance to 5th percentile (rate drops, INR appreciates)
    - Importer: distance to 95th percentile (rate rises, INR depreciates)

* Decision:
    If has_edge is False for the horizon OR expected_gain / downside_risk < threshold (default 0.5):
        LOCK_NOW with reason "no reliable edge"
    Otherwise:
        WAIT with the expected range and probability of a better rate.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from enum import Enum
from typing import Any, Literal

import numpy as np
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

TradeDirection = Literal["exporter", "importer"]


class AdviceDecision(str, Enum):
    """Decision recommendation."""

    LOCK_NOW = "LOCK_NOW"
    WAIT = "WAIT"


class PriceBand(BaseModel):
    """Lower and upper bounds for a forecast band."""

    lower: float
    upper: float


class DecisionReasoning(BaseModel):
    """Structured breakdown of the decision logic for the UI."""

    direction: TradeDirection
    amount_usd: float
    horizon_days: int
    current_spot: float
    forward_adjusted_rate: float
    median_forecast: float
    expected_range_50: PriceBand
    expected_range_90: PriceBand
    expected_gain_inr_per_usd: float
    downside_risk_inr_per_usd: float
    gain_to_risk_ratio: float
    threshold: float
    has_edge: bool
    prob_better_rate: float
    adverse_quantile_used: str
    adverse_rate: float
    potential_total_gain_inr: float
    potential_total_risk_inr: float
    summary: str


class AdviceResult(BaseModel):
    """Complete advice output including decision, reason, and structured reasoning."""

    decision: AdviceDecision
    reason: str
    reasoning: DecisionReasoning


def estimate_forward_rate(
    spot: float,
    horizon_days: int,
    annual_premium_pct: float = 2.5,
) -> float:
    """Calculate forward-adjusted rate based on spot and annualized forward premium."""
    # Approximate calendar days from business days: 1 business day ≈ 1.4 calendar days
    calendar_days = horizon_days * 1.4
    forward_points = spot * (annual_premium_pct / 100.0) * (calendar_days / 365.0)
    return float(spot + forward_points)


def compute_prob_better_rate(
    rates_by_quantile: dict[float, float],
    forward_rate: float,
    direction: TradeDirection,
) -> float:
    """Estimate probability of securing a better rate than the forward rate.

    Uses piecewise linear interpolation on the empirical CDF formed by the
    calibrated quantiles: (0.05, 0.25, 0.50, 0.75, 0.95).
    """
    sorted_q = sorted(rates_by_quantile.keys())
    x_vals = [rates_by_quantile[q] for q in sorted_q]
    y_vals = sorted_q

    # Evaluate CDF at forward_rate
    if forward_rate <= x_vals[0]:
        # Below 5th percentile
        cdf = max(0.001, y_vals[0] * (forward_rate / max(1e-4, x_vals[0])))
    elif forward_rate >= x_vals[-1]:
        # Above 95th percentile
        cdf = min(0.999, y_vals[-1] + 0.04 * (1.0 - np.exp(-(forward_rate - x_vals[-1]))))
    else:
        cdf = float(np.interp(forward_rate, x_vals, y_vals))

    if direction == "exporter":
        # Exporter wants rate > forward_rate
        prob = 1.0 - cdf
    else:
        # Importer wants rate < forward_rate
        prob = cdf

    return float(np.clip(prob, 0.01, 0.99))


class Advisor:
    """FX Hedging Advisor implementing transparent decision rules."""

    def __init__(
        self,
        default_threshold: float = 0.5,
        annual_forward_premium_pct: float = 2.5,
    ) -> None:
        self.default_threshold = default_threshold
        self.annual_forward_premium_pct = annual_forward_premium_pct

    def evaluate(
        self,
        direction: TradeDirection,
        amount_usd: float,
        horizon_days: int,
        current_spot: float,
        predicted_rates: dict[float, float],
        has_edge: bool,
        forward_rate: float | None = None,
        threshold: float | None = None,
    ) -> AdviceResult:
        """Evaluate hedging advice for an MSME exporter or importer.

        Parameters
        ----------
        direction:
            "exporter" (selling USD, receiving INR) or "importer" (buying USD, paying INR).
        amount_usd:
            Trade exposure in USD.
        horizon_days:
            Forecast horizon in business days (e.g. 15).
        current_spot:
            Current USD/INR spot rate.
        predicted_rates:
            dict containing predicted rates at quantiles: 0.05, 0.25, 0.50, 0.75, 0.95.
        has_edge:
            Whether the model shows a statistically validated edge for this horizon.
        forward_rate:
            Current forward-adjusted rate. If None, estimated using annual_forward_premium_pct.
        threshold:
            Configurable gain-to-risk ratio threshold. Defaults to self.default_threshold (0.5).

        Returns
        -------
        AdviceResult
        """
        if threshold is None:
            threshold = self.default_threshold

        if forward_rate is None:
            forward_rate = estimate_forward_rate(
                current_spot, horizon_days, self.annual_forward_premium_pct
            )

        p_05 = float(predicted_rates[0.05])
        p_25 = float(predicted_rates[0.25])
        p_50 = float(predicted_rates[0.50])
        p_75 = float(predicted_rates[0.75])
        p_95 = float(predicted_rates[0.95])

        # ── 1. Expected Gain ──────────────────────────────────────────────────
        # Expected favorable move in INR per USD over the horizon
        if direction == "exporter":
            # Exporter wants USD/INR to rise above the current forward lock
            favorable_move = p_50 - forward_rate
            adverse_side_rate = p_05
            adverse_side_label = "5th percentile (INR appreciation)"
            downside_risk = abs(current_spot - p_05)
        else:  # importer
            # Importer wants USD/INR to drop below the current forward lock
            favorable_move = forward_rate - p_50
            adverse_side_rate = p_95
            adverse_side_label = "95th percentile (INR depreciation)"
            downside_risk = abs(p_95 - current_spot)

        expected_gain = max(0.0, favorable_move)
        downside_risk = max(1e-4, downside_risk)

        # ── 2. Gain to Risk Ratio ─────────────────────────────────────────────
        gain_to_risk = expected_gain / downside_risk

        # ── 3. Probability of a Better Rate ───────────────────────────────────
        prob_better = compute_prob_better_rate(predicted_rates, forward_rate, direction)

        # ── 4. Decision Rule ──────────────────────────────────────────────────
        # If has_edge is false for the horizon OR expected_gain / downside_risk < threshold,
        # return LOCK_NOW with reason "no reliable edge".
        # Otherwise return WAIT with expected range and probability of a better rate.
        if (not has_edge) or (gain_to_risk < threshold):
            decision = AdviceDecision.LOCK_NOW
            reason = "no reliable edge"
            summary = (
                f"Recommendation is to LOCK_NOW at the current forward-adjusted rate of {forward_rate:.4f}. "
                f"The reason is 'no reliable edge': "
                f"{'model has no confirmed statistical edge for this horizon' if not has_edge else f'the gain-to-risk ratio ({gain_to_risk:.2f}) is below the {threshold:.2f} threshold'}."
            )
        else:
            decision = AdviceDecision.WAIT
            reason = (
                f"Favorable move expected ({expected_gain:.4f} INR/USD) with gain/risk ratio {gain_to_risk:.2f} "
                f"(>= {threshold:.2f}) and validated model edge."
            )
            summary = (
                f"Recommendation is to WAIT. Expected favorable move is {expected_gain:.4f} INR/USD "
                f"(median forecast: {p_50:.4f} vs forward rate: {forward_rate:.4f}). "
                f"There is a {prob_better:.1%} estimated probability of obtaining a better rate, "
                f"with 50% range [{p_25:.4f}, {p_75:.4f}] and 90% range [{p_05:.4f}, {p_95:.4f}]."
            )

        reasoning = DecisionReasoning(
            direction=direction,
            amount_usd=float(amount_usd),
            horizon_days=horizon_days,
            current_spot=round(current_spot, 4),
            forward_adjusted_rate=round(forward_rate, 4),
            median_forecast=round(p_50, 4),
            expected_range_50=PriceBand(lower=round(p_25, 4), upper=round(p_75, 4)),
            expected_range_90=PriceBand(lower=round(p_05, 4), upper=round(p_95, 4)),
            expected_gain_inr_per_usd=round(expected_gain, 4),
            downside_risk_inr_per_usd=round(downside_risk, 4),
            gain_to_risk_ratio=round(gain_to_risk, 4),
            threshold=float(threshold),
            has_edge=bool(has_edge),
            prob_better_rate=round(prob_better, 4),
            adverse_quantile_used=adverse_side_label,
            adverse_rate=round(adverse_side_rate, 4),
            potential_total_gain_inr=round(amount_usd * expected_gain, 2),
            potential_total_risk_inr=round(amount_usd * downside_risk, 2),
            summary=summary,
        )

        return AdviceResult(
            decision=decision,
            reason=reason,
            reasoning=reasoning,
        )
