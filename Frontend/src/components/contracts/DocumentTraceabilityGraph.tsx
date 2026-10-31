'use client';

import React, { useState, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react';
import DocumentNode, { DocumentNodeData } from './nodes/DocumentNode';
import { TradeDocument } from '../../types';
import { FileCheck, ShieldAlert, CheckCircle2, Lock, FileSearch, QrCode } from 'lucide-react';

interface Props {
  documents: TradeDocument[];
}

export default function DocumentTraceabilityGraph({ documents }: Props) {
  const [selectedDocId, setSelectedDocId] = useState<string>('DOC-2026-4404'); // Select packing list with alert by default

  const selectedDocument = useMemo(() => {
    return documents.find((d) => d.id === selectedDocId) || documents[0];
  }, [documents, selectedDocId]);

  const nodeTypes = useMemo(
    () => ({
      documentNode: DocumentNode,
    }),
    []
  );

  const { nodes, edges } = useMemo(() => {
    // Root Contract node
    const rootNode: Node = {
      id: 'root-contract',
      type: 'documentNode',
      position: { x: 50, y: 220 },
      data: {
        id: 'CONTRACT-EXP-891',
        title: 'Master Trade Contract #TS-2026-EXP-891',
        type: 'Commercial Contract',
        counterparty: 'Zenith Forgings ⇄ Dutch Precision',
        sha256Snippet: '3f81e9b2...89a',
        integrityStatus: 'Verified',
        amountUSD: 95000,
        isRoot: true,
      } as DocumentNodeData,
    };

    // Linked documents
    const docNodes: Node[] = documents.map((doc, idx) => {
      // Position them in an arc / column to the right
      const yPositions = [40, 140, 240, 340, 440];
      return {
        id: doc.id,
        type: 'documentNode',
        position: { x: 420, y: yPositions[idx % yPositions.length] },
        data: {
          id: doc.id,
          title: doc.title,
          type: doc.type,
          counterparty: doc.counterparty,
          sha256Snippet: doc.sha256Hash.slice(0, 16) + '...',
          integrityStatus: doc.integrityStatus,
          amountUSD: doc.amountUSD,
          isRoot: false,
        } as DocumentNodeData,
      };
    });

    const generatedEdges: Edge[] = documents.map((doc) => {
      const isTamper = doc.integrityStatus === 'Attention Needed' || doc.integrityStatus === 'Tamper Detected';
      return {
        id: `e-contract-${doc.id}`,
        source: 'root-contract',
        target: doc.id,
        animated: isTamper,
        style: {
          stroke: isTamper ? '#f43f5e' : '#10b981',
          strokeWidth: isTamper ? 3 : 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isTamper ? '#f43f5e' : '#10b981',
        },
      };
    });

    return {
      nodes: [rootNode, ...docNodes],
      edges: generatedEdges,
    };
  }, [documents]);

  const onNodeClick = (_: any, node: Node) => {
    if (node.id !== 'root-contract') {
      setSelectedDocId(node.id);
    }
  };

  return (
    <div className="bg-navy-deep/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/20 text-cyan-400">
            <FileSearch className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Document Traceability & Cryptographic Notary Graph
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                DGFT ICEGATE Linked
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              React Flow graph linking invoice, packing list, insurance certificate, and bill of lading to master contract
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> 4 Verified
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 text-rose-400">
            <ShieldAlert className="w-3.5 h-3.5" /> 1 Attention Flag
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* React Flow Canvas: Explicit Height Container */}
        <div 
          className="lg:col-span-2 h-[520px] min-h-[480px] rounded-xl border border-slate-800/80 bg-navy-midnight/90 overflow-hidden relative"
          style={{ height: '520px', minHeight: '480px' }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            minZoom={0.3}
            maxZoom={1.5}
            attributionPosition="bottom-right"
          >
            <Background color="#1e293b" gap={20} size={1.5} />
            <Controls className="!bg-navy-surface !border-slate-700 !fill-slate-300" />
          </ReactFlow>
        </div>

        {/* Selected Document Cryptographic Inspector */}
        <div className="bg-navy-midnight/80 rounded-xl border border-slate-800 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
              <span className="text-xs uppercase font-mono font-bold text-slate-400">
                Cryptographic Audit Card
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                  selectedDocument?.integrityStatus === 'Verified'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}
              >
                {selectedDocument?.integrityStatus}
              </span>
            </div>

            {selectedDocument && (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Document Title</span>
                  <span className="font-bold text-slate-100 text-sm">
                    {selectedDocument.title}
                  </span>
                  <span className="text-slate-500 text-[11px] block">
                    File: {selectedDocument.fileName} ({selectedDocument.fileSize})
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">Counterparty / Issuer</span>
                  <span className="text-slate-200 font-medium">
                    {selectedDocument.counterparty}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">SHA-256 Digest</span>
                  <div className="bg-black/50 p-2 rounded border border-slate-800 font-mono text-[10px] text-cyan-300 break-all">
                    {selectedDocument.sha256Hash}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">Digital Signature & Notary</span>
                  <div className="text-[11px] text-slate-300">
                    <span className="font-semibold text-slate-200">
                      {selectedDocument.verificationDetails.signedBy}
                    </span>
                    <div className="text-slate-400 text-[10px] mt-0.5">
                      Source: {selectedDocument.verificationDetails.notarySource}
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-navy-surface/80 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">Status Verification Note:</span>
                  <span className={`text-[11px] font-medium leading-relaxed ${
                    selectedDocument.integrityStatus === 'Verified'
                      ? 'text-emerald-300'
                      : 'text-rose-300'
                  }`}>
                    {selectedDocument.verificationDetails.verifiedAt}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 mt-3 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1 font-mono text-[10px]">
              <Lock className="w-3.5 h-3.5 text-cyan-400" /> Tamper-Proof Vault
            </span>
            <span className="text-cyan-400 hover:underline cursor-pointer flex items-center gap-1">
              <QrCode className="w-3 h-3" /> View QR Proof
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

