'use client';

import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react';
import ContractLifecycleNode, { ContractLifecycleNodeData } from './nodes/ContractLifecycleNode';
import { ForwardContract } from '../../types';
import { FileCheck, Shield, KeyRound, Building, CheckCircle2 } from 'lucide-react';

interface Props {
  contract?: ForwardContract;
}

export default function ContractLifecycleFlow({ contract }: Props) {
  // Default forward contract if none passed
  const activeContract: ForwardContract = contract || {
    id: "FWD-2026-0182",
    bank: "HDFC Bank Global Treasury",
    contractType: "Export Forward (Deliverable)",
    currencyPair: "USD/INR",
    notionalUSD: 150000,
    lockedRate: 86.5800,
    spotAtBooking: 86.3200,
    bookingDate: "2026-10-05",
    maturityDate: "2026-11-20",
    status: "Active",
    lifecycleStage: "shipped",
    integrityHash: "9f83c162bca9812401efb561cda41a203f56781290312fa89b2138947612caba",
    digitalSignature: "RSA-4096:0x4A8F...29E1 (HDFC Treasury Verified)",
    mtmGainLossINR: +39000,
    settlementInstructions: "Nostro Credit to Citibank NY AC #981240",
  };

  const nodeTypes = useMemo(
    () => ({
      lifecycleStep: ContractLifecycleNode,
    }),
    []
  );

  const { nodes, edges } = useMemo(() => {
    // Determine stages: Draft -> Hashed -> Signed -> Shipped -> Paid
    // Active contract is currently at stage "shipped"
    const stages: Array<{
      step: 'draft' | 'hashed' | 'signed' | 'shipped' | 'paid';
      title: string;
      stepNumber: number;
      status: 'completed' | 'active' | 'pending';
      timestamp?: string;
      hashSnippet?: string;
      signatory?: string;
      detail: string;
    }> = [
      {
        step: 'draft',
        title: 'Contract Draft & Terms',
        stepNumber: 1,
        status: 'completed',
        timestamp: 'Oct 05, 2026 10:15 IST',
        detail: `$${activeContract.notionalUSD.toLocaleString()} USD locked at ₹${activeContract.lockedRate.toFixed(4)}`,
      },
      {
        step: 'hashed',
        title: 'SHA-256 Immutability Hash',
        stepNumber: 2,
        status: 'completed',
        timestamp: 'Oct 05, 2026 10:22 IST',
        hashSnippet: activeContract.integrityHash.slice(0, 16) + '...',
        detail: 'Document digest anchored into DGFT ICEGATE audit ledger',
      },
      {
        step: 'signed',
        title: 'Dual RSA-4096 Signatures',
        stepNumber: 3,
        status: 'completed',
        timestamp: 'Oct 05, 2026 11:04 IST',
        signatory: activeContract.digitalSignature.slice(0, 24),
        detail: `Signed by Zenith Treasury & ${activeContract.bank}`,
      },
      {
        step: 'shipped',
        title: 'Carrier Bill of Lading Tied',
        stepNumber: 4,
        status: 'active',
        timestamp: 'Oct 19, 2026 (Live)',
        detail: 'MSK2641-01 verified in transit past Cape route',
      },
      {
        step: 'paid',
        title: 'Nostro Settlement & Release',
        stepNumber: 5,
        status: 'pending',
        timestamp: `Scheduled: ${activeContract.maturityDate}`,
        detail: activeContract.settlementInstructions,
      },
    ];

    const generatedNodes: Node[] = stages.map((s, idx) => ({
      id: `stage-${s.step}`,
      type: 'lifecycleStep',
      position: { x: 50 + idx * 300, y: 140 },
      data: s as ContractLifecycleNodeData,
    }));

    const generatedEdges: Edge[] = [];
    for (let i = 0; i < stages.length - 1; i++) {
      const isPast = stages[i].status === 'completed' && stages[i + 1].status !== 'pending';
      const isCurrent = stages[i + 1].status === 'active';

      generatedEdges.push({
        id: `e-${stages[i].step}-${stages[i + 1].step}`,
        source: `stage-${stages[i].step}`,
        target: `stage-${stages[i + 1].step}`,
        animated: isCurrent,
        style: {
          stroke: isPast || isCurrent ? '#38bdf8' : '#334155',
          strokeWidth: isCurrent ? 3 : 2,
          strokeDasharray: stages[i + 1].status === 'pending' ? '4 4' : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isPast || isCurrent ? '#38bdf8' : '#475569',
        },
      });
    }

    return { nodes: generatedNodes, edges: generatedEdges };
  }, [activeContract]);

  return (
    <div className="bg-navy-deep/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Contract Lifecycle State Machine: {activeContract.id}
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Active Deliverable Forward
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Deterministic progression: draft → hashed → signed → shipped → paid with cryptographic verification
            </p>
          </div>
        </div>

        <div className="text-right text-xs">
          <span className="text-slate-400 block text-[10px]">Bank Partner</span>
          <span className="font-semibold text-slate-200">{activeContract.bank}</span>
        </div>
      </div>

      {/* Explicit Height Container for React Flow */}
      <div
        className="w-full h-[460px] min-h-[440px] rounded-xl border border-slate-800/80 bg-navy-midnight/90 overflow-hidden relative"
        style={{ height: '460px', minHeight: '440px' }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.4}
          maxZoom={1.5}
          attributionPosition="bottom-right"
        >
          <Background color="#1e293b" gap={20} size={1.5} />
          <Controls className="!bg-navy-surface !border-slate-700 !fill-slate-300" />
        </ReactFlow>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-800 text-xs">
        <div>
          <span className="text-slate-400 block text-[10px]">Contract Principal</span>
          <span className="font-mono font-bold text-cyan-300">
            ${activeContract.notionalUSD.toLocaleString()} USD
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">Locked Forward Rate</span>
          <span className="font-mono font-bold text-emerald-300">
            ₹{activeContract.lockedRate.toFixed(4)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">Mark-to-Market Yield</span>
          <span className="font-mono font-bold text-emerald-400">
            +₹{activeContract.mtmGainLossINR.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">Maturity / Nostro Date</span>
          <span className="font-mono text-slate-300">
            {activeContract.maturityDate}
          </span>
        </div>
      </div>
    </div>
  );
}

