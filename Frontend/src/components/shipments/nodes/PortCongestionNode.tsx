'use client';

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { AlertTriangle, Clock, Ship, DollarSign } from 'lucide-react';

export interface PortCongestionNodeData extends Record<string, unknown> {
  portName: string;
  dwellTimeDays: number;
  baselineDiffDays: number;
  terminal: string;
  costImpactEstimate: string;
  severity: 'elevated' | 'critical' | 'moderate';
}

function PortCongestionNode({ data }: { data: PortCongestionNodeData }) {
  const isCritical = data.severity === 'critical';
  const isElevated = data.severity === 'elevated';

  return (
    <div className={`relative px-4 py-3 rounded-2xl border backdrop-blur-md shadow-2xl min-w-[240px] transition-all hover:scale-105 ${
      isCritical 
        ? 'bg-rose-950/90 border-rose-500/80 text-rose-100 ring-2 ring-rose-500/30' 
        : isElevated 
        ? 'bg-amber-950/90 border-amber-500/80 text-amber-100 ring-2 ring-amber-500/30'
        : 'bg-slate-900/90 border-slate-700 text-slate-200'
    }`}>
      {/* Target handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-amber-400 !border-2 !border-slate-900"
      />

      <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-current/20">
        <div className={`p-1.5 rounded-lg ${
          isCritical ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
        }`}>
          <AlertTriangle className="w-4 h-4 animate-bounce" />
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider font-bold block opacity-75">
            Logistics Sentinel Alert
          </span>
          <span className="text-xs font-bold leading-none">
            Port Congestion Flag
          </span>
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between font-semibold">
          <span className="flex items-center gap-1.5">
            <Ship className="w-3.5 h-3.5 opacity-80" />
            {data.portName}
          </span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
            isCritical ? 'bg-rose-800/80 text-white' : 'bg-amber-800/80 text-amber-100'
          }`}>
            +{data.baselineDiffDays}d Dwell
          </span>
        </div>

        <div className="text-[11px] opacity-90 leading-tight">
          Terminal: <span className="font-mono">{data.terminal}</span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-current/20 text-[10px]">
          <span className="flex items-center gap-1 opacity-80">
            <Clock className="w-3 h-3" />
            Avg Turn: {data.dwellTimeDays} days
          </span>
          <span className="font-mono font-bold flex items-center gap-0.5">
            <DollarSign className="w-3 h-3" />
            {data.costImpactEstimate}
          </span>
        </div>
      </div>

      {/* Source handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-amber-400 !border-2 !border-slate-900"
      />
    </div>
  );
}

export default memo(PortCongestionNode);
