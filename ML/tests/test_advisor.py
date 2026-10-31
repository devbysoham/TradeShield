"""
tests/test_advisor.py — Unit tests for transparent FX hedging decision rules.
"""

from __future__ import annotations

import pytest

from app.decision.advisor import (
    AdviceDecision,
    Advisor,
    compute_prob_better_rate,
    estimate_forward_rate,
)


@pytest.fixture
def advisor() -> Advisor:
    return Advisor(default_threshold=0.5, annual_forward_premium_pct=2.5)


@pytest.fixture
def sample_predicted_rates() -> dict[float, float]:
    """Sample rates where USD/INR is expected to rise (median 85.50 vs spot 84.00)."""
    return {
        0.05: 83.20,
        0.25: 84.60,
        0.50: 85.50,
        0.75: 86.20,
        0.95: 87.40,
    }


class TestForwardRateEstimation:
    def test_forward_rate_increases_with_horizon(self):
        f5 = estimate_forward_rate(spot=84.0, horizon_days=5, annual_premium_pct=2.5)
        f15 = estimate_forward_rate(spot=84.0, horizon_days=15, annual_premium_pct=2.5)
        assert f15 > f5
        assert f5 > 84.0

    def test_forward_rate_zero_premium(self):
        f = estimate_forward_rate(spot=84.0, horizon_days=15, annual_premium_pct=0.0)
        assert f == pytest.approx(84.0)


class TestProbBetterRate:
    def test_exporter_prob_decreases_as_target_increases(self, sample_predicted_rates):
        # Exporter wants rate > target. If target is higher, prob should be lower.
        p_low = compute_prob_better_rate(sample_predicted_rates, 84.0, "exporter")
        p_high = compute_prob_better_rate(sample_predicted_rates, 86.0, "exporter")
        assert p_low > p_high

    def test_importer_prob_increases_as_target_increases(self, sample_predicted_rates):
        # Importer wants rate < target. If target is higher, prob should be higher.
        p_low = compute_prob_better_rate(sample_predicted_rates, 84.0, "importer")
        p_high = compute_prob_better_rate(sample_predicted_rates, 86.0, "importer")
        assert p_high > p_low


class TestExporterDecisionRule:
    def test_exporter_wait_when_edge_and_high_gain_ratio(self, advisor, sample_predicted_rates):
        """Spot=84.0, forward~84.12, median=85.50 -> expected gain ~ 1.38.

        Downside risk = |84.0 - 83.20| = 0.80. Ratio = 1.38 / 0.80 = 1.725 >= 0.5.
        With has_edge=True, action should be WAIT.
        """
        res = advisor.evaluate(
            direction="exporter",
            amount_usd=100_000,
            horizon_days=15,
            current_spot=84.0,
            predicted_rates=sample_predicted_rates,
            has_edge=True,
            threshold=0.5,
        )
        assert res.decision == AdviceDecision.WAIT
        assert "WAIT" in res.decision.value
        assert res.reasoning.gain_to_risk_ratio >= 0.5
        assert res.reasoning.has_edge is True
        assert res.reasoning.expected_range_90.lower == 83.20
        assert res.reasoning.expected_range_90.upper == 87.40
        assert res.reasoning.prob_better_rate > 0.5
        assert res.reasoning.potential_total_gain_inr > 0

    def test_exporter_lock_now_when_no_edge(self, advisor, sample_predicted_rates):
        """Even with high expected gain, if has_edge=False, must return LOCK_NOW."""
        res = advisor.evaluate(
            direction="exporter",
            amount_usd=100_000,
            horizon_days=15,
            current_spot=84.0,
            predicted_rates=sample_predicted_rates,
            has_edge=False,
            threshold=0.5,
        )
        assert res.decision == AdviceDecision.LOCK_NOW
        assert res.reason == "no reliable edge"

    def test_exporter_lock_now_when_gain_ratio_below_threshold(self, advisor):
        """When median forecast is close to or below forward rate, ratio < 0.5 -> LOCK_NOW."""
        flat_rates = {
            0.05: 82.50,  # downside risk = |84.0 - 82.50| = 1.50
            0.25: 83.80,
            0.50: 84.15,  # forward rate is ~84.12, expected gain = 0.03 -> ratio = 0.03/1.5 = 0.02 < 0.5
            0.75: 84.50,
            0.95: 85.50,
        }
        res = advisor.evaluate(
            direction="exporter",
            amount_usd=100_000,
            horizon_days=15,
            current_spot=84.0,
            predicted_rates=flat_rates,
            has_edge=True,
            threshold=0.5,
        )
        assert res.decision == AdviceDecision.LOCK_NOW
        assert res.reason == "no reliable edge"


class TestImporterDecisionRule:
    def test_importer_wait_when_rate_expected_to_drop(self, advisor):
        """Spot=84.0, forward~84.12. Rates expected to drop: median=82.50.

        Expected gain = forward (84.12) - median (82.50) = 1.62.
        Adverse side is 95th quantile = 84.80. Downside risk = |84.80 - 84.0| = 0.80.
        Ratio = 1.62 / 0.80 = 2.025 >= 0.5. With has_edge=True, action should be WAIT.
        """
        dropping_rates = {
            0.05: 81.00,
            0.25: 81.80,
            0.50: 82.50,
            0.75: 83.40,
            0.95: 84.80,
        }
        res = advisor.evaluate(
            direction="importer",
            amount_usd=50_000,
            horizon_days=15,
            current_spot=84.0,
            predicted_rates=dropping_rates,
            has_edge=True,
            threshold=0.5,
        )
        assert res.decision == AdviceDecision.WAIT
        assert res.reasoning.gain_to_risk_ratio >= 0.5
        assert "95th percentile" in res.reasoning.adverse_quantile_used
        assert res.reasoning.adverse_rate == 84.80

    def test_importer_lock_now_when_rate_expected_to_rise(self, advisor, sample_predicted_rates):
        """USD/INR is expected to rise (median 85.50 > forward ~84.12).

        Expected gain for importer is 0.0. Ratio is 0.0 < 0.5 -> LOCK_NOW.
        """
        res = advisor.evaluate(
            direction="importer",
            amount_usd=50_000,
            horizon_days=15,
            current_spot=84.0,
            predicted_rates=sample_predicted_rates,
            has_edge=True,
            threshold=0.5,
        )
        assert res.decision == AdviceDecision.LOCK_NOW
        assert res.reason == "no reliable edge"

    def test_importer_lock_now_when_no_edge(self, advisor):
        dropping_rates = {
            0.05: 81.00,
            0.25: 81.80,
            0.50: 82.50,
            0.75: 83.40,
            0.95: 84.80,
        }
        res = advisor.evaluate(
            direction="importer",
            amount_usd=50_000,
            horizon_days=15,
            current_spot=84.0,
            predicted_rates=dropping_rates,
            has_edge=False,
            threshold=0.5,
        )
        assert res.decision == AdviceDecision.LOCK_NOW
        assert res.reason == "no reliable edge"
