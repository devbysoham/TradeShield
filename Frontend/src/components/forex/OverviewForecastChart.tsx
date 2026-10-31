'use client';

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { ForexTimeSeriesPoint, ModelMetrics } from '../../types';

interface Props {
  data: ForexTimeSeriesPoint[];
  metrics: ModelMetrics;
  onOpenForecastDetail?: () => void;
}

export default function OverviewForecastChart({ data, metrics, onOpenForecastDetail }: Props) {
  // Custom minimal tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload as ForexTimeSeriesPoint;
      const isForecast = point.type === 'forecast';

      return (
        <div className="bg-surface border border-hairline p-3 rounded-lg shadow-soft text-xs space-y-1 min-w-[180px]">
          <div className="font-serif text-sm text-text border-b border-hairline pb-1 flex justify-between">
            <span>{label}</span>
            <span className="text-[11px] font-sans text-text-muted">
              {isForecast ? 'Forecast' : 'Historical Close'}
            </span>
          </div>

          {point.spot !== undefined && (
            <div className="flex justify-between items-center text-text pt-0.5">
              <span className="text-text-muted">Spot:</span>
              <span className="tabular-nums font-medium">₹{point.spot.toFixed(4)}</span>
            </div>
          )}

          {point.forecast !== undefined && (
            <div className="flex justify-between items-center text-accent pt-0.5">
              <span className="text-text-muted">Projected:</span>
              <span className="tabular-nums font-medium">₹{point.forecast.toFixed(4)}</span>
            </div>
          )}

          {point.upperBand !== undefined && point.lowerBand !== undefined && (
            <div className="flex justify-between items-center text-text-muted text-[11px] pt-1 border-t border-hairline">
              <span>90% Range:</span>
              <span className="tabular-nums text-text">
                ₹{point.lowerBand.toFixed(2)} – ₹{point.upperBand.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full my-12 sm:my-16">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-text-muted font-sans font-medium">
            Forward Outlook
          </div>
          <h3 className="font-serif text-3xl sm:text-4xl text-text font-normal tracking-tight mt-1">
            USD/INR 15-day projected corridor
          </h3>
        </div>

        {/* Human sentence instead of buzzwords */}
        <div className="text-sm text-text-muted font-sans flex items-center gap-2">
          <span>We&apos;re 64% sure on direction, so we&apos;d hedge.</span>
        </div>
      </div>

      {/* Full-width chart canvas with no card border */}
      <div className="w-full h-[420px] sm:h-[480px] -mx-2 sm:mx-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 20, right: 20, left: -10, bottom: 0 }}
          >
            <defs>
              {/* Flat coral confidence band at ~12% opacity */}
              <linearGradient id="coralBandGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F0445A" stopOpacity={0.16} />
                <stop offset="100%" stopColor="#F0445A" stopOpacity={0.08} />
              </linearGradient>
            </defs>

            {/* Faint subtle gridlines */}
            <CartesianGrid
              stroke="rgba(255, 255, 255, 0.04)"
              strokeDasharray="0"
              vertical={false}
            />

            <XAxis
              dataKey="date"
              stroke="#6E6A62"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              interval="preserveStartEnd"
              tickFormatter={(v) => v.replace(' (Today)', '').replace(' (T+1)', '').replace(' (T+8)', '')}
            />

            <YAxis
              stroke="#6E6A62"
              fontSize={11}
              domain={[85.6, 88.0]}
              tickFormatter={(v) => `₹${v.toFixed(1)}`}
              tickLine={false}
              axisLine={false}
              orientation="right"
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Direct Chart Annotation: Today */}
            <ReferenceLine
              x="Oct 30 (Today)"
              stroke="#E8E6E1"
              strokeWidth={1}
              strokeDasharray="2 2"
              label={{
                value: 'Today',
                fill: '#9E9A90',
                fontSize: 11,
                position: 'top',
                offset: 10,
              }}
            />

            {/* Direct Chart Annotation: Nov 12 receivable */}
            <ReferenceLine
              x="Nov 12 (T+8)"
              stroke="#F0445A"
              strokeWidth={1}
              strokeDasharray="3 3"
              label={{
                value: 'Nov 12 receivable ($95k)',
                fill: '#F0445A',
                fontSize: 11,
                position: 'top',
                offset: 10,
              }}
            />

            {/* Stacked transparent base + flat coral band */}
            <Area
              type="monotone"
              dataKey="lowerBand"
              stackId="band"
              stroke="transparent"
              fill="transparent"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="bandWidth"
              stackId="band"
              stroke="#F0445A"
              strokeWidth={1}
              strokeOpacity={0.3}
              fill="url(#coralBandGradient)"
              isAnimationActive={true}
            />

            {/* Historical spot line (crisp off-white) */}
            <Line
              type="monotone"
              dataKey="spot"
              stroke="#E8E6E1"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 4, fill: '#E8E6E1', stroke: '#1C1A17', strokeWidth: 2 }}
              connectNulls={false}
            />

            {/* Forecast median line (single coral line) */}
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#F0445A"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#F0445A', stroke: '#1C1A17', strokeWidth: 2 }}
              connectNulls={false}
            />

            {/* No-change baseline (dashed muted line) */}
            <Line
              type="stepAfter"
              dataKey="baseline"
              stroke="#6E6A62"
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Handcrafted detail: small rotated or quiet footnote caption */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-text-faint font-sans mt-3 pt-3 border-t border-hairline">
        <div>
          Baseline rate: ₹86.4250 · Flat band indicates 90% confidence corridor.
        </div>
        <div>
          Out-of-sample backtest across 740 historical trading days.
        </div>
      </div>
    </div>
  );
}

