'use client';

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Anchor, MapPin, Navigation, CheckCircle2, Clock } from 'lucide-react';

export interface WaypointNodeData extends Record<string, unknown> {
  title: string;
  locationCode: string;
  type: 'origin' | 'hub' | 'waypoint' | 'destination';
  status: 'completed' | 'in-progress' | 'pending';
  riskLevel: 'Low' | 'Moderate' | 'Elevated' | 'Critical';
  dateLabel: string;
  description: string;
  activeShipmentCount?: number;
}

function WaypointNode({ data }: { data: WaypointNodeData }) {
  // Risk color mapping
  const riskColor = 
    data.riskLevel === 'Low' ? 'border-emerald-500/80 bg-emerald-950/70 text-emerald-200' :
    data.riskLevel === 'Moderate' ? 'border-amber-500/80 bg-amber-950/70 text-amber-200' :
    'border-rose-500/80 bg-rose-950/70 text-rose-200';

  const badgeBg =
    data.riskLevel === 'Low' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
    data.riskLevel === 'Moderate' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
    'bg-rose-500/20 text-rose-300 border-rose-500/30';

  const isOrigin = data.type === 'origin';
  const isDest = data.type === 'destination';
  const isInProgress = data.status === 'in-progress';

  return (
    <div className={`relative px-4 py-3 rounded-2xl border backdrop-blur-md shadow-2xl min-w-[210px] max-w-[260px] transition-all hover:scale-105 ${riskColor} ${
      isInProgress ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950' : ''
    }`}>
      {/* Target Handle if not origin */}
      {!isOrigin && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-slate-900"
        />
      )}

      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-current/20">
        <div className="flex items-center gap-1.5">
          {isOrigin ? (
            <MapPin className="w-4 h-4 text-emerald-400" />
          ) : isDest ? (
            <Anchor className="w-4 h-4 text-cyan-400" />
          ) : (
            <Navigation className="w-4 h-4 text-amber-400" />
          )}
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider opacity-80">
            {data.type} • {data.locationCode}
          </span>
        </div>

        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${badgeBg}`}>
          {data.riskLevel} Risk
        </span>
      </div>

      <div className="space-y-1">
        <h4 className="text-xs font-bold text-slate-100 flex items-center justify-between">
          <span>{data.title}</span>
          {data.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
          {isInProgress && <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
        </h4>

        <p className="text-[11px] text-slate-300 opacity-90 leading-snug">
          {data.description}
        </p>

        <div className="flex items-center justify-between pt-1 border-t border-current/20 text-[10px] text-slate-400">
          <span className="font-mono">{data.dateLabel}</span>
          <span className="capitalize px-1.5 py-0.2 rounded bg-black/30 font-medium">
            {data.status}
          </span>
        </div>
      </div>

      {/* Source Handle (Bottom for destination node linking to alert sentinel, Right for transit hubs) */}
      <Handle
        type="source"
        position={isDest ? Position.Bottom : Position.Right}
        className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-slate-900"
      />
    </div>
  );
}

export default memo(WaypointNode);
