'use client';

import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Figure from '../primitives/Figure';
import Reveal from '../primitives/Reveal';
import { WorkspaceSummary, ForexRate } from '../../types';

interface Props {
  workspace: WorkspaceSummary;
  forexRate?: ForexRate;
  onReviewQuote: () => void;
}

export default function OverviewHero({ workspace, forexRate, onReviewQuote }: Props) {
  const isExporter = workspace.role === 'exporter';
  const prefersReducedMotion = useReducedMotion();

  // Subtle pointer-based parallax (2-4px)
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 4;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 4;
    setParallax({ x, y });
  };

  const handleMouseLeave = () => {
    setParallax({ x: 0, y: 0 });
  };

  const spot = forexRate?.spot ?? 86.425;
  const changeDay = forexRate?.changeDay ?? 0.142;
  const changePercent = forexRate?.changePercent ?? 0.16;

  // Reasoning and figures from recommendation
  const rec = workspace.advisorRecommendation;
  const bankQuote = rec?.bankForwardQuote ?? 86.6850;
  const expectedSpot = rec?.expectedSpot ?? 86.7200;

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full pt-8 sm:pt-12 pb-6"
    >
      {/* 1. The live USD/INR rate in page header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-8 border-b border-hairline">
        <div className="flex items-baseline gap-4">
          <span className="text-xs uppercase tracking-wider text-text-muted font-sans font-medium">
            USD / INR Spot
          </span>
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-3xl sm:text-4xl text-text font-light tracking-tight tabular-nums">
              ₹{spot.toFixed(4)}
            </span>
            <span className="text-xs text-text-muted font-sans">
              +{changeDay.toFixed(4)} today (+{changePercent}%)
            </span>
          </div>
        </div>

        <div className="text-xs text-text-faint font-sans">
          RBI Ref Rate: ₹86.3810 · Session {forexRate?.lastUpdated || 'Today, 14:30 IST'}
        </div>
      </div>

      {/* 2. Hero: One question answered in plain language */}
      <div className="pt-12 sm:pt-16 pb-8 max-w-4xl">
        <div
          style={{
            transform: `translate3d(${parallax.x}px, ${parallax.y}px, 0)`,
            transition: 'transform 0.15s ease-out',
          }}
        >
          <Reveal delay={0.1} duration={0.8}>
            <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl text-text font-normal tracking-tight leading-[1.05]">
              {isExporter
                ? 'Lock 80% of your November receivable today.'
                : 'Cover $100,000 before the dollar tests resistance.'}
            </h1>
          </Reveal>
        </div>

        {/* Reasoning sentence + Coral Review Quote button */}
        <Reveal delay={0.25} duration={0.8} yOffset={60}>
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row sm:items-center gap-6">
            <button
              onClick={onReviewQuote}
              className="bg-accent text-[#1C1A17] hover:bg-accent-hover px-6 py-3 rounded-lg text-sm font-sans font-medium transition-colors flex items-center justify-center gap-2 self-start"
            >
              <span>Review quote</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </button>

            <p className="text-sm text-text-muted font-sans leading-relaxed max-w-xl">
              {isExporter
                ? 'Forward premium pays +0.26 above spot. Locking secures ₹82.35L against rupee strength.'
                : 'USD is pressing upper channel resistance. Locking at 86.66 caps your procurement outlay.'}
            </p>
          </div>
        </Reveal>
      </div>

      {/* 3. Three-column row with hairline dividers, NO CARD */}
      <div className="mt-8 pt-8 border-t border-hairline grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-0">
        {/* Column 1: Bank Forward Quote */}
        <div className="sm:pr-8 sm:border-r border-hairline">
          <div className="text-xs uppercase tracking-wide text-text-muted font-sans font-medium mb-1.5">
            Bank forward quote (Nov 12)
          </div>
          <div className="font-serif text-2xl sm:text-3xl text-text tracking-tight font-normal">
            <Figure
              value={bankQuote}
              prefix="₹"
              decimals={4}
              duration={0.9}
            />
          </div>
          <div className="text-xs text-text-faint font-sans mt-1">
            +₹0.2600 annualized forward premium
          </div>
        </div>

        {/* Column 2: Expected Spot */}
        <div className="sm:px-8 sm:border-r border-hairline">
          <div className="text-xs uppercase tracking-wide text-text-muted font-sans font-medium mb-1.5">
            Projected spot
          </div>
          <div className="font-serif text-2xl sm:text-3xl text-text tracking-tight font-normal">
            <Figure
              value={expectedSpot}
              prefix="₹"
              decimals={4}
              duration={0.9}
            />
          </div>
          <div className="text-xs text-text-faint font-sans mt-1">
            Median 15-day forward estimate
          </div>
        </div>

        {/* Column 3: Protected Margin */}
        <div className="sm:pl-8">
          <div className="text-xs uppercase tracking-wide text-text-muted font-sans font-medium mb-1.5">
            Downside buffer secured
          </div>
          <div className="font-serif text-2xl sm:text-3xl text-gain tracking-tight font-normal">
            {isExporter ? '₹82,175' : '₹91,200'}
          </div>
          <div className="text-xs text-text-faint font-sans mt-1">
            Protected against adverse rupee retreat
          </div>
        </div>
      </div>
    </div>
  );
}

