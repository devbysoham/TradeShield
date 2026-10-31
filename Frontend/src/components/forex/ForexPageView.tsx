'use client';

import React from 'react';
import { useForexData, useForwardContracts, useWorkspaceSummary } from '../../lib/api';
import UsdInrForecastChart from './UsdInrForecastChart';
import BaselineComparisonChart from './BaselineComparisonChart';
import ForexRiskGauges from './ForexRiskGauges';
import HedgeAdvisorCard from './HedgeAdvisorCard';
import { TrendingUp, ShieldCheck, Cpu, Database, Award, CheckCircle2 } from 'lucide-react';

export default function ForexPageView() {
  const { rates, timeSeries, metrics } = useForexData();
  const { contracts } = useForwardContracts();
  const { workspace } = useWorkspaceSummary('exporter');

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2.5 text-xs font-mono text-cyan-400 mb-1">
          <TrendingUp className="w-4 h-4" />
          <span>RECHARTS FINANCIAL INTELLIGENCE</span>
        </div>
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">
          USD/INR Exchange Rate Forecast & Hedge Architecture
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl">
          15-Day multi-step predictive trajectory generated via hybrid XGBoost-GRU model calibrated on RBI FX reserves,
          US 10-Year yields, Brent Crude prices, and DXY index momentum.
        </p>
      </div>

      {/* Advisory Banner */}
      {workspace.advisorRecommendation && (
        <HedgeAdvisorCard recommendation={workspace.advisorRecommendation} />
      )}

      {/* Primary Recharts ComposedChart: USD/INR History + 15D Forecast + Shaded Range */}
      <UsdInrForecastChart data={timeSeries} metrics={metrics} />

      {/* Secondary Recharts Chart: Forecast vs No-Change Baseline Comparison */}
      <BaselineComparisonChart data={timeSeries} metrics={metrics} />

      {/* Recharts Multi-Dimensional Risk Gauges */}
      <ForexRiskGauges
        hedgeRatio={workspace.hedgeRatio}
        shipmentRiskScore={74}
        docIntegrityScore={95}
      />

      {/* Forward Contracts Ledger Table */}
      <div className="bg-navy-deep/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Active Forward Contracts & Hedges Ledger
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Total Locked: $285,000 USD
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="pb-2">Contract ID</th>
                <th className="pb-2">Counterparty Bank</th>
                <th className="pb-2">Principal (USD)</th>
                <th className="pb-2">Locked Rate</th>
                <th className="pb-2">Maturity</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">MTM Gain/Loss</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {contracts.map((c) => (
                <tr key={c.id} className="hover:bg-navy-surface/40 transition-colors">
                  <td className="py-3 font-bold text-cyan-300">{c.id}</td>
                  <td className="py-3 text-slate-200">{c.bank}</td>
                  <td className="py-3 font-semibold text-slate-100">
                    ${c.notionalUSD.toLocaleString()}
                  </td>
                  <td className="py-3 text-emerald-400 font-bold">₹{c.lockedRate.toFixed(4)}</td>
                  <td className="py-3 text-slate-400">{c.maturityDate}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      c.status === 'Active' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 text-right text-emerald-400 font-bold">
                    +₹{c.mtmGainLossINR.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model Features & Methodology */}
      <div className="bg-navy-deep/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm text-xs">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <h4 className="text-sm font-bold text-slate-100">
            Model Features & Backtest Architecture ({metrics.version})
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-slate-400 block mb-2 font-mono text-[11px]">
              Exogenous Features Tracked:
            </span>
            <ul className="space-y-1.5 text-slate-300">
              {metrics.featuresTracked.map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-navy-midnight/80 p-3 rounded-xl border border-slate-800 space-y-2">
            <span className="text-slate-400 block font-mono text-[11px]">
              Regulatory & Model Governance Notice:
            </span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              {metrics.sampleEvaluationNotice}
            </p>
            <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 font-mono">
              Last Training Checkpoint: {metrics.lastTrained}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

