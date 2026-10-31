'use client';

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileText, ShieldAlert, CheckCircle2, ShieldCheck, Link2 } from 'lucide-react';

export interface DocumentNodeData extends Record<string, unknown> {
  id: string;
  title: string;
  type: string;
  counterparty: string;
  sha256Snippet: string;
  integrityStatus: 'Verified' | 'Tamper Detected' | 'Attention Needed';
  amountUSD?: number;
  isRoot?: boolean;
}

function DocumentNode({ data }: { data: DocumentNodeData }) {
  const isVerified = data.integrityStatus === 'Verified';
  const isTamper = data.integrityStatus === 'Tamper Detected' || data.integrityStatus === 'Attention Needed';
  const isRoot = data.isRoot;

  return (
    <div
      className={`relative px-4 py-3 rounded-2xl border backdrop-blur-md shadow-2xl min-w-[230px] max-w-[270px] transition-all hover:scale-105 ${
        isRoot
          ? 'bg-navy-surface border-cyan-500/80 text-cyan-100 ring-2 ring-cyan-500/30'
          : isTamper
          ? 'bg-rose-950/90 border-rose-500/80 text-rose-100 ring-2 ring-rose-500/30'
          : 'bg-navy-midnight/90 border-emerald-500/60 text-emerald-100'
      }`}
    >
      {/* Target handle unless root */}
      {!isRoot && (
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
              isRoot
                ? 'bg-cyan-500/20 text-cyan-300'
                : isTamper
                ? 'bg-rose-500/20 text-rose-300'
                : 'bg-emerald-500/20 text-emerald-300'
            }`}
          >
            {isRoot ? <Link2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono font-bold block opacity-75">
              {data.type}
            </span>
          </div>
        </div>

        <span
          className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
            isVerified
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              : isTamper
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          {data.integrityStatus}
        </span>
      </div>

      <div className="space-y-1">
        <h4 className="text-xs font-bold text-slate-100 leading-tight">
          {data.title}
        </h4>

        <div className="text-[11px] opacity-85 text-slate-300">
          Entity: <span className="font-medium text-slate-200">{data.counterparty}</span>
        </div>

        <div className="text-[9px] font-mono bg-black/40 px-2 py-0.5 rounded text-cyan-300 truncate">
          SHA256: {data.sha256Snippet}
        </div>

        {data.amountUSD !== undefined && (
          <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-current/15 flex justify-between">
            <span>Invoice Value:</span>
            <span className="text-emerald-400 font-bold">${data.amountUSD.toLocaleString()} USD</span>
          </div>
        )}
      </div>

      {/* Source handle if root */}
      {isRoot && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-slate-900"
        />
      )}
    </div>
  );
}

export default memo(DocumentNode);
