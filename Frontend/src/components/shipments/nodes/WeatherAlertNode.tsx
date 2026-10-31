'use client';

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CloudLightning, Wind, Compass, Waves } from 'lucide-react';

export interface WeatherAlertNodeData extends Record<string, unknown> {
  corridor: string;
  phenomenon: string;
  waveHeightMeters: number;
  windSpeedKnots: number;
  rerouteImpact: string;
  severity: 'moderate' | 'high' | 'extreme';
}

function WeatherAlertNode({ data }: { data: WeatherAlertNodeData }) {
  const isHigh = data.severity === 'high' || data.severity === 'extreme';

  return (
    <div className={`relative px-4 py-3 rounded-2xl border backdrop-blur-md shadow-2xl min-w-[240px] transition-all hover:scale-105 ${
      isHigh
        ? 'bg-indigo-950/90 border-indigo-500/80 text-indigo-100 ring-2 ring-indigo-500/30'
        : 'bg-cyan-950/90 border-cyan-500/80 text-cyan-100 ring-2 ring-cyan-500/30'
    }`}>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-slate-900"
      />

      <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-current/20">
        <div className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg">
          <CloudLightning className="w-4 h-4 animate-pulse" />
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider font-bold block opacity-75">
            Meteorological Alert
          </span>
          <span className="text-xs font-bold leading-none">
            {data.phenomenon}
          </span>
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <Compass className="w-3.5 h-3.5 opacity-80" />
            {data.corridor}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold bg-indigo-800/80 text-indigo-100">
            {data.severity.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px] py-1 bg-black/20 px-2 rounded-lg font-mono">
          <div className="flex items-center gap-1">
            <Waves className="w-3 h-3 text-cyan-400" />
            <span>Swell: {data.waveHeightMeters}m</span>
          </div>
          <div className="flex items-center gap-1">
            <Wind className="w-3 h-3 text-indigo-400" />
            <span>Gales: {data.windSpeedKnots} kts</span>
          </div>
        </div>

        <div className="text-[10px] opacity-85 leading-tight pt-0.5">
          Action: <span className="text-cyan-200 font-medium">{data.rerouteImpact}</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-slate-900"
      />
    </div>
  );
}

export default memo(WeatherAlertNode);
