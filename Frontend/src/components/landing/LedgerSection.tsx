'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ShieldCheck, TrendingUp, Anchor, FileCheck } from 'lucide-react';
import { CUBIC_EASE } from '../primitives/Reveal';

interface LedgerItem {
  id: string;
  title: string;
  description: string;
  figure: string;
  figureSub: string;
  preview: React.ReactNode;
}

const LEDGER_ROWS: LedgerItem[] = [
  {
    id: 'forex',
    title: 'Forex outlook',
    description: '15-day forward corridor calibrated against real trade flows and RBI signals.',
    figure: '+₹0.26 premium',
    figureSub: 'above spot',
    preview: (
      <div className="space-y-2 text-xs">
        <div className="flex justify-between text-text-muted">
          <span>USD/INR Projection</span>
          <span className="text-accent font-medium">87.01 median</span>
        </div>
        <div className="h-10 w-full flex items-end gap-1 pt-2 border-b border-hairline">
          <div className="h-4 w-1/5 bg-surface-raised rounded-t" />
          <div className="h-6 w-1/5 bg-surface-raised rounded-t" />
          <div className="h-7 w-1/5 bg-accent/30 rounded-t" />
          <div className="h-8 w-1/5 bg-accent/60 rounded-t" />
          <div className="h-10 w-1/5 bg-accent rounded-t" />
        </div>
        <div className="text-[10px] text-text-faint">Directional certainty: 64.2%</div>
      </div>
    ),
  },
  {
    id: 'forwards',
    title: 'Forward contracts',
    description: 'Lock your bank forward rate in two clicks to eliminate rupee appreciation risk.',
    figure: '₹82,35,075',
    figureSub: 'guaranteed locked',
    preview: (
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-text-muted">HDFC Treasury Forward</span>
          <span className="text-gain font-medium">Active</span>
        </div>
        <div className="font-serif text-lg text-text">₹86.6850 / USD</div>
        <div className="text-[10px] text-text-muted">Zero downside exposure secured</div>
      </div>
    ),
  },
  {
    id: 'shipments',
    title: 'Shipment risk',
    description: 'Live maritime sentinel that flags vessel delays and container port dwell times.',
    figure: '2 vessels delayed',
    figureSub: 'Rotterdam +1.9d dwell',
    preview: (
      <div className="space-y-2 text-xs">
        <div className="flex justify-between text-text-muted">
          <span>MSK-2641W (Rotterdam)</span>
          <span className="text-accent">Cape route</span>
        </div>
        <div className="text-[11px] text-text">4.8d dwell time at Maasvlakte</div>
        <div className="text-[10px] text-text-faint">Demurrage buffer: ₹1.18 Lakh</div>
      </div>
    ),
  },
  {
    id: 'documents',
    title: 'Documents and insurance',
    description: 'Cryptographic SHA-256 notary hashes linked directly to DGFT ICEGATE declarations.',
    figure: 'SHA-256 intact',
    figureSub: 'DGFT verified',
    preview: (
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-1.5 text-gain">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>ICEGATE Signature Valid</span>
        </div>
        <div className="font-mono text-[9px] text-text-muted truncate">
          e3b0c44298fc1c149afbf4c8996fb9242...
        </div>
        <div className="text-[10px] text-text-faint">All cargo insurance terms aligned</div>
      </div>
    ),
  },
];

export default function LedgerSection() {
  const [activeItem, setActiveItem] = useState<LedgerItem | null>(null);

  return (
    <section id="what-it-does" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 border-t border-hairline">
      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 mb-16">
        <div>
          <span className="text-xs uppercase tracking-wide text-text-muted font-sans font-medium">
            Core Capabilities
          </span>
          <h2 className="font-serif text-4xl sm:text-5xl text-text font-normal tracking-tight mt-2">
            Built as a ledger. Not a template.
          </h2>
        </div>
        <p className="text-sm text-text-muted font-sans max-w-md">
          Four interconnected pillars that protect your export realization from bill of lading to bank settlement.
        </p>
      </div>

      {/* Four rows separated by hairlines */}
      <div className="divide-y divide-hairline border-y border-hairline relative">
        {LEDGER_ROWS.map((row) => (
          <div
            key={row.id}
            onMouseEnter={() => setActiveItem(row)}
            onMouseLeave={() => setActiveItem(null)}
            className="py-8 sm:py-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center transition-transform duration-200 hover:translate-x-1 cursor-pointer group"
          >
            {/* Title & Arrow */}
            <div className="md:col-span-4 flex items-center gap-4">
              <h3 className="font-serif text-2xl sm:text-3xl text-text font-normal group-hover:text-accent transition-colors">
                {row.title}
              </h3>
              <ArrowRight
                className="w-5 h-5 text-accent opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
                strokeWidth={1.5}
              />
            </div>

            {/* Description */}
            <div className="md:col-span-5 text-sm text-text-muted font-sans leading-relaxed">
              {row.description}
            </div>

            {/* Right-aligned figure */}
            <div className="md:col-span-3 text-left md:text-right">
              <div className="font-serif text-2xl text-text tracking-tight font-normal">
                {row.figure}
              </div>
              <div className="text-xs text-text-faint font-sans mt-0.5">
                {row.figureSub}
              </div>
            </div>
          </div>
        ))}

        {/* Floating Spatial Component Preview on Hover */}
        <AnimatePresence>
          {activeItem && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 5 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="hidden lg:block absolute right-12 -top-16 z-30 w-72 bg-surface p-5 rounded-[20px] border border-hairlineStrong shadow-sheet pointer-events-none"
            >
              {activeItem.preview}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

