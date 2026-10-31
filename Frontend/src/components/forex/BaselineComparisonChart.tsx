'use client';

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { ForexTimeSeriesPoint, ModelMetrics } from '../../types';
import { Scale, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react';

interface Props {
  data: ForexTimeSeriesPoint[];
  metrics: ModelMetrics;
}

export default function BaselineComparisonChart({ data, metrics }: Props) {
  // Filter only forecast horizon for focused baseline comparison
  const forecastOnly = data.filter(d => d.type === 'forecast' || d.type === 'boundary').map(d => {
    const diff = d.forecast && d.baseline ? Number((d.forecast - d.baseline).toFixed(4)) : 0;
    return {
      date: d.date.replace(' (Today)', '').replace(/\(T\+\d+\)/, ''),
      forecast: d.forecast,
      baseline: d.baseline,
      spread: diff,
      upperBand: d.upperBand,
      lowerBand: d.lowerBand,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-navy-deep/95 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1">
          <div className="font-semibold text-slate-200 border-b border-slate-700 pb-1">
            {label} Horizon Comparison
          </div>
          <div className="text-cyan-400 font-mono">
            Model Forecast: ₹{item.forecast?.toFixed(4)}
          </div>
          <div className="text-amber-400 font-mono">
            No-Change Baseline: ₹{item.baseline?.toFixed(4)}
          </div>
          <div className="text-emerald-400 font-mono font-bold">
            Projected Shift: +{item.spread?.toFixed(4)} INR
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-navy-deep/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Forecast vs No-Change Baseline Comparison
              <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-full">
                +{metrics.directionAccuracy - metrics.baselineAccuracy}% Alpha
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Evaluates model predictive edge against the standard financial random-walk martingale assumption
            </p>
          </div>
        </div>
      </div>

      <div className="w-full h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={forecastOnly}
            margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
            <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
            <YAxis
              yAxisId="rate"
              stroke="#64748b"
              fontSize={10}
              domain={[86.2, 87.2]}
              tickFormatter={(v) => `₹${v.toFixed(2)}`}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="spread"
              orientation="right"
              stroke="#10b981"
              fontSize={10}
              domain={[-0.1, 0.7]}
              tickFormatter={(v) => `+₹${v.toFixed(2)}`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

            <Bar
              yAxisId="spread"
              dataKey="spread"
              name="Forecast Divergence Spread (INR)"
              fill="#10b981"
              opacity={0.35}
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="rate"
              type="monotone"
              dataKey="forecast"
              name="AI Model Trajectory"
              stroke="#38bdf8"
              strokeWidth={2.5}
              dot={{ r: 2.5 }}
            />
            <Line
              yAxisId="rate"
              type="stepAfter"
              dataKey="baseline"
              name="No-Change Baseline (86.425)"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="4 4"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-800 text-xs">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-slate-200">Directional Accuracy Edge</div>
            <div className="text-slate-400 text-[11px]">
              64.2% hit rate across 740 out-of-sample backtests vs 49.8% for martingale no-change.
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-slate-200">Forward Curve Capture</div>
            <div className="text-slate-400 text-[11px]">
              USD/INR reflects +0.585 INR upward momentum driven by US 10Y yields & Brent crude import bills.
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-slate-200">Hedging Decision Rule</div>
            <div className="text-slate-400 text-[11px]">
              Exporter forward quote at 86.6850 offers risk-free premium locking above spot.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

