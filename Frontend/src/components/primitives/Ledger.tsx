'use client';

import React from 'react';
import Figure from './Figure';
import { WorkspaceSummary } from '../../types';

interface LedgerProps {
  workspace: WorkspaceSummary;
  onOpenShipments?: () => void;
  onOpenDocuments?: () => void;
}

export default function Ledger({
  workspace,
  onOpenShipments,
  onOpenDocuments,
}: LedgerProps) {
  const isExporter = workspace.role === 'exporter';

  return (
    <div className="w-full border-y border-hairline py-8 sm:py-10 my-12 sm:my-16">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0">
        {/* Metric 1: Total Currency Exposure (Most prominent) */}
        <div className="lg:pr-8 lg:border-r border-hairline flex flex-col justify-between">
          <span className="text-xs uppercase tracking-wide text-text-muted font-sans font-medium mb-3">
            {isExporter ? 'Open receivables' : 'Open payables'}
          </span>
          <div>
            <div className="text-4xl sm:text-5xl font-serif text-text tracking-tight font-normal">
              <Figure
                value={workspace.totalExposureUSD}
                prefix="$"
                suffix="USD"
                duration={1.2}
              />
            </div>
            <div className="text-xs text-text-muted font-sans mt-2">
              ≈ ₹{((workspace.totalExposureINR) / 10000000).toFixed(2)} Crore •{' '}
              <span className="text-accent">{workspace.primaryRiskMetric}</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Hedge Coverage Ratio */}
        <div className="lg:px-8 lg:border-r border-hairline flex flex-col justify-between">
          <span className="text-xs uppercase tracking-wide text-text-muted font-sans font-medium mb-3">
            Hedge coverage
          </span>
          <div>
            <div className="text-3xl sm:text-4xl font-serif text-text tracking-tight font-normal">
              <Figure
                value={workspace.hedgeRatio}
                suffix="%"
                decimals={1}
                duration={1.0}
              />
            </div>
            <div className="text-xs text-text-muted font-sans mt-2">
              ${(workspace.hedgedAmountUSD / 1000).toFixed(0)}k locked · ${(workspace.unhedgedAmountUSD / 1000).toFixed(0)}k open
            </div>
          </div>
        </div>

        {/* Metric 3: Active Shipments */}
        <div
          onClick={onOpenShipments}
          className="lg:px-8 lg:border-r border-hairline flex flex-col justify-between group cursor-pointer"
        >
          <span className="text-xs uppercase tracking-wide text-text-muted font-sans font-medium mb-3 group-hover:text-text transition-colors">
            Active shipments
          </span>
          <div>
            <div className="text-3xl sm:text-4xl font-serif text-text tracking-tight font-normal flex items-baseline gap-2">
              <Figure
                value={workspace.activeShipmentsCount}
                duration={0.8}
              />
              <span className="text-base font-sans text-text-muted font-normal">vessels</span>
            </div>
            <div className="text-xs text-text-muted font-sans mt-2">
              <span className="text-accent">{workspace.shipmentsAtRiskCount} vessels</span> may slip past their port window
            </div>
          </div>
        </div>

        {/* Metric 4: Trade Documents */}
        <div
          onClick={onOpenDocuments}
          className="lg:pl-8 flex flex-col justify-between group cursor-pointer"
        >
          <span className="text-xs uppercase tracking-wide text-text-muted font-sans font-medium mb-3 group-hover:text-text transition-colors">
            Trade documents
          </span>
          <div>
            <div className="text-3xl sm:text-4xl font-serif text-text tracking-tight font-normal flex items-baseline gap-2">
              <Figure
                value={5}
                duration={0.8}
              />
              <span className="text-base font-sans text-text-muted font-normal">filed</span>
            </div>
            <div className="text-xs text-text-muted font-sans mt-2">
              <span className="text-accent">Three documents</span> still need a signature
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

