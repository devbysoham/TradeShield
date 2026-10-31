'use client';

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileText, Hash, Key, Ship, CheckCircle2, DollarSign } from 'lucide-react';

export interface ContractLifecycleNodeData extends Record<string, unknown> {
  step: 'draft' | 'hashed' | 'signed' | 'shipped' | 'paid';
  title: string;
  stepNumber: number;
  status: 'completed' | 'active' | 'pending';
  timestamp?: string;
  hashSnippet?: string;
  signatory?: string;
  detail: string;
}

function ContractLifecycleNode({ data }: { data: ContractLifecycleNodeData }) {
  const isCompleted = data.status === 'completed';
  const isActive = data.status === 'active';

  const getStepIcon = () => {
    switch (data.step) {
      case 'draft':
        return <FileText className="w-4 h-4" />;
      case 'hashed':
        return <Hash className="w-4 h-4" />;
      case 'signed':
        return <Key className="w-4 h-4" />;
      case 'shipped':
        return <Ship className="w-4 h-4" />;
      case 'paid':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div
      className={`relative px-4 py-3.5 rounded-2xl border backdrop-blur-md shadow-2xl min-w-[220px] max-w-[250px] transition-all hover:scale-105 ${
        isCompleted
          ? 'bg-emerald-950/80 border-emerald-500/70 text-emerald-100'
          : isActive
          ? 'bg-cyan-950/90 border-cyan-400 text-cyan-100 ring-4 ring-cyan-500/30'
          : 'bg-slate-900/80 border-slate-800 text-slate-400'
      }`}
    >
      {/* Target handle if not first step */}
      {data.stepNumber > 1 && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-slate-900"
        />
      )}

      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-current/20">
        <div className="flex items-center gap-1.5">
          <div
            className={`p-1.5 rounded-lg ${
              isCompleted
                ? 'bg-emerald-500/20 text-emerald-300'
                : isActive
                ? 'bg-cyan-500/20 text-cyan-300 animate-pulse'
                : 'bg-slate-800 text-slate-500'
            }`}
          >
            {getStepIcon()}
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold">
            Step 0{data.stepNumber}
          </span>
        </div>

        <span
          className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border ${
            isCompleted
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              : isActive
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              : 'bg-slate-800 text-slate-500 border-slate-700'
          }`}
        >
          {data.status}
        </span>
      </div>

      <div className="space-y-1">
        <h4 className="text-xs font-bold text-slate-100 flex items-center justify-between">
          <span>{data.title}</span>
          {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
        </h4>

        <p className="text-[11px] opacity-90 leading-snug">
          {data.detail}
        </p>

        {data.hashSnippet && (
          <div className="text-[9px] font-mono bg-black/40 px-2 py-0.5 rounded text-cyan-300 truncate">
            SHA256: {data.hashSnippet}
          </div>
        )}

        {data.signatory && (
          <div className="text-[9px] text-slate-300 truncate font-mono">
            Key: {data.signatory}
          </div>
        )}

        {data.timestamp && (
          <div className="text-[9px] text-slate-400 pt-1 border-t border-current/15 font-mono">
            {data.timestamp}
          </div>
        )}
      </div>

      {/* Source handle if not last step */}
      {data.stepNumber < 5 && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-slate-900"
        />
      )}
    </div>
  );
}

export default memo(ContractLifecycleNode);
