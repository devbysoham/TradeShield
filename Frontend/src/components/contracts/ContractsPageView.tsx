'use client';

import React, { useState } from 'react';
import { useForwardContracts, useDocuments } from '../../lib/api';
import ContractLifecycleFlow from './ContractLifecycleFlow';
import DocumentTraceabilityGraph from './DocumentTraceabilityGraph';
import { FileCheck, FileSearch, ShieldCheck, GitFork, QrCode } from 'lucide-react';

export default function ContractsPageView() {
  const { contracts } = useForwardContracts();
  const { documents } = useDocuments();
  const [activeTab, setActiveTab] = useState<'both' | 'lifecycle' | 'documents'>('both');

  const selectedContract = contracts[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-xs font-mono text-emerald-400 mb-1">
            <FileCheck className="w-4 h-4" />
            <span>REACT FLOW (@xyflow/react v12) CONTRACT & DOCUMENT TOPOLOGY</span>
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            Trade Contract Lifecycle & Cryptographic Traceability
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Audit-grade verification pipelines: deterministic state machines from draft to settlement,
            and document notary graphs connecting invoices, packing lists, and insurance certificates with tamper detection.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-navy-deep p-1 rounded-xl border border-slate-800 text-xs self-start sm:self-auto shadow-inner">
          <button
            onClick={() => setActiveTab('both')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'both'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Unified View
          </button>
          <button
            onClick={() => setActiveTab('lifecycle')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'lifecycle'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Lifecycle Machine
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'documents'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Document Graph
          </button>
        </div>
      </div>

      {/* Contract Lifecycle State Machine */}
      {(activeTab === 'both' || activeTab === 'lifecycle') && (
        <ContractLifecycleFlow contract={selectedContract} />
      )}

      {/* Document Traceability Graph */}
      {(activeTab === 'both' || activeTab === 'documents') && (
        <DocumentTraceabilityGraph documents={documents} />
      )}
    </div>
  );
}

