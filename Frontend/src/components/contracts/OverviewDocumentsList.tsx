'use client';

import React from 'react';
import { TradeDocument } from '../../types';
import { ArrowUpRight } from 'lucide-react';

interface Props {
  documents: TradeDocument[];
  onSelectDocument: (doc: TradeDocument) => void;
}

export default function OverviewDocumentsList({ documents, onSelectDocument }: Props) {
  return (
    <div className="w-full bg-surface/50 border border-hairline rounded-[20px] p-6 sm:p-8 flex flex-col justify-between">
      <div>
        <div className="flex items-baseline justify-between mb-1">
          <div className="text-xs uppercase tracking-wide text-text-muted font-sans font-medium">
            Assurance
          </div>
          <span className="text-xs text-accent font-sans">
            1 needs review
          </span>
        </div>

        <h3 className="font-serif text-2xl text-text font-normal tracking-tight">
          Trade Documents
        </h3>

        <p className="text-xs text-text-muted mt-1 leading-relaxed">
          Three documents still need a signature before customs clearance at Rotterdam.
        </p>

        {/* Hairline-separated document list */}
        <div className="mt-6 divide-y divide-hairline">
          {documents.slice(0, 4).map((doc) => {
            const isAttention = doc.integrityStatus === 'Attention Needed';

            return (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                className="py-3.5 group cursor-pointer flex items-center justify-between gap-4 transition-transform duration-200 hover:translate-x-1"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isAttention ? 'bg-accent' : 'bg-gain'
                      }`}
                    />
                    <span className="text-sm font-sans font-medium text-text group-hover:text-accent transition-colors truncate">
                      {doc.title}
                    </span>
                  </div>
                  <div className="text-xs text-text-faint font-sans mt-0.5 pl-3.5 truncate">
                    {doc.counterparty} · {doc.type}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs font-sans ${
                      isAttention ? 'text-accent' : 'text-text-muted'
                    }`}
                  >
                    {isAttention ? 'Review' : 'Verified'}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-text-faint group-hover:text-accent transition-colors" strokeWidth={1.5} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-4 border-t border-hairline mt-6 flex items-center justify-between text-xs text-text-faint font-sans">
        <span>Vault & DGFT ICEGATE connected</span>
        <span>SHA-256 notary chain</span>
      </div>
    </div>
  );
}

