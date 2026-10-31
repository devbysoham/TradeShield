'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { ForexTimeSeriesPoint, ModelMetrics } from '../../types';
import { TrendingUp, ShieldAlert, Cpu, Eye, Info } from 'lucide-react';

interface Props {
  data: ForexTimeSeriesPoint[];
  metrics: ModelMetrics;
}

export default function UsdInrForecastChart({ data, metrics }: Props) {
  const [showBaseline, setShowBaseline] = useState(true);
  const [renderMode, setRenderMode] = useState<'stacked' | 'direct'>('stacked');

  // Custom Tooltip component for financial precision
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload as ForexTimeSeriesPoint;
      const isForecast = point.type === 'forecast';
      const isBoundary = point.type === 'boundary';

      return (
        <div className="bg-navy-deep/95 backdrop-blur border border-slate-700/80 p-3.5 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[200px]">
          <div className="font-semibold text-slate-200 border-b border-slate-700/60 pb-1 flex justify-between items-center">
            <span>{label}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
              isForecast ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800' :
              isBoundary ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' :
              'bg-slate-800 text-slate-300'
            }`}>
              {isForecast ? '15D Forecast' : isBoundary ? 'Today' : 'Historical Close'}
            </span>
          </div>

          {point.spot !== undefined && (
            <div className="flex justify-between items-center text-emerald-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Historical Spot:
              </span>
              <span className="font-mono font-bold">₹{point.spot.toFixed(4)}</span>
            </div>
          )}

          {point.forecast !== undefined && (
            <div className="flex justify-between items-center text-cyan-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                Median Forecast:
              </span>
              <span className="font-mono font-bold">₹{point.forecast.toFixed(4)}</span>
            </div>
          )}

          {point.upperBand !== undefined && point.lowerBand !== undefined && (
            <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-slate-800">
              <span className="text-slate-400">Likely Range (90% CI):</span>
              <span className="font-mono text-cyan-200 font-medium">
                ₹{point.lowerBand.toFixed(2)} – ₹{point.upperBand.toFixed(2)}
              </span>
            </div>
          )}

          {showBaseline && point.baseline !== undefined && (
            <div className="flex justify-between items-center text-amber-400/90 text-[11px]">
              <span className="text-amber-400/80">No-Change Baseline:</span>
              <span className="font-mono">₹{point.baseline.toFixed(4)}</span>
            </div>
          )}

          {point.forecast && point.baseline && (
            <div className="text-[10px] text-slate-400 text-right pt-0.5">
              Net Shift: <span className="text-cyan-300 font-mono">+{(point.forecast - point.baseline).toFixed(4)} INR</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-navy-deep/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
      {/* Header controls & meta */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/20 text-cyan-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                USD/INR Spot History & 15-Day Forward Forecast
                <span className="text-[11px] font-mono font-normal px-2 py-0.5 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-full">
                  {metrics.version}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Calibrated XGBoost-GRU Ensemble with 90% Confidence Prediction Band & Baseline Comparison
              </p>
            </div>
          </div>
        </div>

        {/* View toggles */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-navy-midnight/80 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setRenderMode('stacked')}
              className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                renderMode === 'stacked'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Stack transparent base under shaded confidence band"
            >
              Stacked Area
            </button>
            <button
              onClick={() => setRenderMode('direct')}
              className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                renderMode === 'direct'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Direct upper/lower band envelope"
            >
              Envelope Area
            </button>
          </div>

          <button
            onClick={() => setShowBaseline(!showBaseline)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              showBaseline
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                : 'bg-navy-midnight/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Baseline (No-Change)</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[380px] sm:h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 15, right: 25, left: -10, bottom: 5 }}
          >
            <defs>
              {/* Cyan gradient for likely range band */}
              <linearGradient id="likelyRangeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.06} />
              </linearGradient>
              <linearGradient id="spotAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />

            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              interval="preserveStartEnd"
            />
            
            <YAxis
              stroke="#64748b"
              fontSize={11}
              domain={[85.6, 88.0]}
              tickFormatter={(v) => `₹${v.toFixed(1)}`}
              tickLine={false}
              axisLine={false}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              wrapperStyle={{ paddingTop: '14px', fontSize: '12px' }}
              iconType="circle"
            />

            {/* Reference Line dividing History and 15D Forward Forecast */}
            <ReferenceLine
              x="Oct 30 (Today)"
              stroke="#38bdf8"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: 'Forecast Horizon Start (Today)',
                fill: '#38bdf8',
                fontSize: 10,
                position: 'top',
              }}
            />

            {/* Implementation A: Stacked transparent base area under shaded band */}
            {renderMode === 'stacked' ? (
              <>
                {/* 1. Transparent base up to lowerBand */}
                <Area
                  type="monotone"
                  dataKey="lowerBand"
                  stackId="confidenceBand"
                  stroke="transparent"
                  fill="transparent"
                  isAnimationActive={false}
                  legendType="none"
                />
                {/* 2. Shaded band representing (upperBand - lowerBand) */}
                <Area
                  type="monotone"
                  dataKey="bandWidth"
                  name="Likely Range (90% Confidence Interval)"
                  stackId="confidenceBand"
                  stroke="#38bdf8"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  fill="url(#likelyRangeGradient)"
                  isAnimationActive={true}
                />
              </>
            ) : (
              /* Implementation B: Direct envelope area pair */
              <>
                <Area
                  type="monotone"
                  dataKey="upperBand"
                  name="Upper Confidence Band"
                  stroke="#38bdf8"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  fill="url(#likelyRangeGradient)"
                  fillOpacity={0.15}
                />
                <Area
                  type="monotone"
                  dataKey="lowerBand"
                  name="Lower Confidence Band"
                  stroke="#0284c7"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  fill="transparent"
                />
              </>
            )}

            {/* Historical Spot Line */}
            <Line
              type="monotone"
              dataKey="spot"
              name="Historical Spot (Close)"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 2.5, fill: '#10b981', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#34d399', stroke: '#064e3b', strokeWidth: 2 }}
              connectNulls={false}
            />

            {/* Median Forecast Line */}
            <Line
              type="monotone"
              dataKey="forecast"
              name="Median Forecast (Central Estimate)"
              stroke="#38bdf8"
              strokeWidth={3}
              dot={{ r: 3, fill: '#38bdf8', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#7dd3fc', stroke: '#0369a1', strokeWidth: 2 }}
              connectNulls={false}
            />

            {/* Forecast vs No-Change Baseline Comparison */}
            {showBaseline && (
              <Line
                type="stepAfter"
                dataKey="baseline"
                name="No-Change Baseline (86.425)"
                stroke="#f59e0b"
                strokeWidth={1.8}
                strokeDasharray="4 4"
                dot={false}
                connectNulls={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Model Insight Footer Callouts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-800/80 text-xs">
        <div className="bg-navy-midnight/60 p-2.5 rounded-xl border border-slate-800/80">
          <span className="text-slate-400 block text-[11px]">Directional Accuracy</span>
          <span className="text-emerald-400 font-mono font-bold text-sm">
            {metrics.directionAccuracy}%
          </span>
          <span className="text-slate-500 text-[10px] ml-1">(vs {metrics.baselineAccuracy}% baseline)</span>
        </div>

        <div className="bg-navy-midnight/60 p-2.5 rounded-xl border border-slate-800/80">
          <span className="text-slate-400 block text-[11px]">Out-of-Sample RMSE</span>
          <span className="text-cyan-300 font-mono font-bold text-sm">
            ₹{metrics.rmse}
          </span>
          <span className="text-slate-500 text-[10px] ml-1">(MAE: ₹{metrics.mae})</span>
        </div>

        <div className="bg-navy-midnight/60 p-2.5 rounded-xl border border-slate-800/80">
          <span className="text-slate-400 block text-[11px]">15-Day Target (Nov 21)</span>
          <span className="text-cyan-400 font-mono font-bold text-sm">
            ₹87.01
          </span>
          <span className="text-slate-400 text-[10px] ml-1">[86.13 - 87.82]</span>
        </div>

        <div className="bg-navy-midnight/60 p-2.5 rounded-xl border border-slate-800/80">
          <span className="text-slate-400 block text-[11px]">Calibration Brier Score</span>
          <span className="text-purple-300 font-mono font-bold text-sm">
            {metrics.brierScore}
          </span>
          <span className="text-emerald-400 text-[10px] ml-1 font-medium">Well Calibrated</span>
        </div>
      </div>
    </div>
  );
}

