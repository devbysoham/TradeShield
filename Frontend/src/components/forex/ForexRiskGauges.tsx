'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ShieldCheck, Anchor, AlertTriangle, Layers } from 'lucide-react';

interface Props {
  hedgeRatio: number;
  shipmentRiskScore: number;
  docIntegrityScore: number;
}

export default function ForexRiskGauges({
  hedgeRatio = 59.1,
  shipmentRiskScore = 74,
  docIntegrityScore = 95,
}: Props) {
  // Semi-circle gauge data helper
  const createGaugeData = (value: number, max: number = 100) => {
    const clamped = Math.min(Math.max(value, 0), max);
    return [
      { name: 'Score', value: clamped },
      { name: 'Remaining', value: max - clamped },
    ];
  };

  const hedgeData = createGaugeData(hedgeRatio);
  const shipmentData = createGaugeData(shipmentRiskScore);
  const docData = createGaugeData(docIntegrityScore);

  return (
    <div className="bg-navy-deep/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20 text-purple-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              TradeSHIELD Real-Time Risk Gauges
            </h3>
            <p className="text-xs text-slate-400">
              Recharts multi-dimensional risk monitoring for treasury, logistics, and verification
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full border border-slate-700">
          Live RBI & Sentinel Feed
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gauge 1: FX Hedge Coverage */}
        <div className="bg-navy-midnight/70 p-4 rounded-xl border border-slate-800 flex flex-col items-center relative">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium mb-1">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>FX Hedge Coverage</span>
          </div>

          <div className="w-full h-[130px] relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={hedgeData}
                  cx="50%"
                  cy="85%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={50}
                  outerRadius={68}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#38bdf8" />
                  <Cell fill="#1e293b" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Value in center of gauge */}
            <div className="absolute bottom-2 text-center">
              <span className="text-2xl font-bold font-mono text-cyan-300">
                {hedgeRatio}%
              </span>
              <div className="text-[10px] text-slate-400">Of Open Exposure</div>
            </div>
          </div>

          <div className="w-full mt-2 pt-2 border-t border-slate-800/80 flex justify-between text-[11px]">
            <span className="text-slate-400">Target Band: 60-80%</span>
            <span className="text-cyan-400 font-medium">Moderate Buffer</span>
          </div>
        </div>

        {/* Gauge 2: Port & Logistics Congestion Risk */}
        <div className="bg-navy-midnight/70 p-4 rounded-xl border border-slate-800 flex flex-col items-center relative">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium mb-1">
            <Anchor className="w-4 h-4 text-coral-muted" />
            <span>Logistics Congestion Index</span>
          </div>

          <div className="w-full h-[130px] relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={shipmentData}
                  cx="50%"
                  cy="85%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={50}
                  outerRadius={68}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#f43f5e" />
                  <Cell fill="#1e293b" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute bottom-2 text-center">
              <span className="text-2xl font-bold font-mono text-rose-400">
                {shipmentRiskScore}/100
              </span>
              <div className="text-[10px] text-rose-300 font-medium">Elevated Risk</div>
            </div>
          </div>

          <div className="w-full mt-2 pt-2 border-t border-slate-800/80 flex justify-between text-[11px]">
            <span className="text-slate-400">Rotterdam Dwell +1.9d</span>
            <span className="text-rose-400 font-medium">Reroute Active</span>
          </div>
        </div>

        {/* Gauge 3: Cryptographic Document Integrity */}
        <div className="bg-navy-midnight/70 p-4 rounded-xl border border-slate-800 flex flex-col items-center relative">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium mb-1">
            <AlertTriangle className="w-4 h-4 text-emerald-400" />
            <span>Document Integrity Score</span>
          </div>

          <div className="w-full h-[130px] relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={docData}
                  cx="50%"
                  cy="85%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={50}
                  outerRadius={68}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#1e293b" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute bottom-2 text-center">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {docIntegrityScore}%
              </span>
              <div className="text-[10px] text-emerald-300">Notary Verified</div>
            </div>
          </div>

          <div className="w-full mt-2 pt-2 border-t border-slate-800/80 flex justify-between text-[11px]">
            <span className="text-slate-400">4 / 5 Hash Intact</span>
            <span className="text-amber-400 font-medium">1 Weight Mismatch</span>
          </div>
        </div>
      </div>
    </div>
  );
}

