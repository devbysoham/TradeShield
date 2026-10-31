'use client';

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

export interface QuietRouteNodeData extends Record<string, unknown> {
  label: string;
  sublabel: string;
  status: 'completed' | 'in-progress' | 'pending';
  isVessel?: boolean;
  annotation?: string;
  isLast?: boolean;
  isFirst?: boolean;
}

function QuietRouteNode({ data }: { data: QuietRouteNodeData }) {
  const isVessel = data.isVessel;
  const isCompleted = data.status === 'completed';

  return (
    <div className="relative flex flex-col items-center group cursor-pointer">
      {/* Target handle if not first */}
      {!data.isFirst && (
        <Handle
          type="target"
          position={Position.Left}
          className="!opacity-0 !w-1 !h-1 pointer-events-none"
        />
      )}

      {/* Visual Dot */}
      <div className="relative flex items-center justify-center my-1">
        {isVessel ? (
          <>
            {/* Gentle coral pulse */}
            <span className="absolute w-6 h-6 rounded-full bg-accent/20 animate-ping" />
            <span className="relative w-3.5 h-3.5 rounded-full bg-accent ring-4 ring-bg shadow-sm" />
          </>
        ) : (
          <span
            className={`w-2.5 h-2.5 rounded-full ring-2 ring-bg transition-transform duration-200 group-hover:scale-125 ${
              isCompleted ? 'bg-text-muted' : 'bg-surface-raised border border-hairline'
            }`}
          />
        )}
      </div>

      {/* Label and Sublabel below dot */}
      <div className="mt-2 text-center whitespace-nowrap">
        <div
          className={`text-xs font-sans font-medium transition-colors ${
            isVessel ? 'text-accent' : isCompleted ? 'text-text' : 'text-text-muted'
          }`}
        >
          {data.label}
        </div>
        <div className="text-[11px] text-text-faint font-sans mt-0.5">
          {data.sublabel}
        </div>

        {/* Optional quiet annotation */}
        {data.annotation && (
          <div className="mt-1 text-[10px] text-accent font-sans">
            {data.annotation}
          </div>
        )}
      </div>

      {/* Source handle if not last */}
      {!data.isLast && (
        <Handle
          type="source"
          position={Position.Right}
          className="!opacity-0 !w-1 !h-1 pointer-events-none"
        />
      )}
    </div>
  );
}

export default memo(QuietRouteNode);

