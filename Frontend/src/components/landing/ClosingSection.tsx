'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import TradeShieldMark from '../primitives/TradeShieldMark';

export default function ClosingSection() {
  return (
    <footer className="border-t border-hairline bg-bg pt-24 sm:pt-36 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Huge serif closing callout */}
        <div className="max-w-4xl mb-24 sm:mb-32">
          <h2 className="font-serif text-5xl sm:text-7xl lg:text-8xl text-text font-normal tracking-tight leading-[1.02]">
            Lock it in before it moves.
          </h2>

          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row sm:items-center gap-6">
            <Link
              href="/overview"
              className="bg-accent hover:bg-accent-hover text-[#1C1A17] font-sans text-sm font-medium px-7 py-3.5 rounded-lg transition-colors flex items-center justify-center gap-2 group self-start"
            >
              <span>Start free</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
            </Link>

            <span className="text-xs text-text-faint font-sans">
              Check today&apos;s rates and see your protected margin in under two minutes.
            </span>
          </div>
        </div>

        {/* Minimal Footer with hairline divider */}
        <div className="pt-8 border-t border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-xs text-text-muted font-sans">
          <div className="flex items-center gap-2.5">
            <TradeShieldMark size={18} className="text-accent" />
            <span className="text-text font-medium">TradeShield</span>
            <span className="text-hairlineStrong">•</span>
            <span className="text-text-faint">Handcrafted for cross-border commerce</span>
          </div>

          <div className="flex items-center gap-6 text-text-muted">
            <Link href="/overview" className="hover:text-text transition-colors">
              Overview
            </Link>
            <Link href="/forex" className="hover:text-text transition-colors">
              Forecast
            </Link>
            <Link href="/shipments" className="hover:text-text transition-colors">
              Shipments
            </Link>
            <Link href="/contracts" className="hover:text-text transition-colors">
              Documents
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

