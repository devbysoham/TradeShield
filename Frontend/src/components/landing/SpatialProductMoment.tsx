'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { CUBIC_EASE } from '../primitives/Reveal';
import { ArrowRight, Check } from 'lucide-react';

export default function SpatialProductMoment() {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  // Rotate straightens from -2deg to 0deg as user scrolls into view
  const rotateVal = useTransform(scrollYProgress, [0.1, 0.45], [-2.2, 0]);
  const sheetY = useTransform(scrollYProgress, [0.2, 0.5], [40, -10]);
  const sheetScale = useTransform(scrollYProgress, [0.2, 0.5], [0.92, 1]);

  return (
    <section ref={containerRef} className="py-24 sm:py-36 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="text-center max-w-2xl mx-auto mb-16 sm:mb-20">
        <span className="text-xs uppercase tracking-wide text-text-muted font-sans font-medium">
          The Workspace
        </span>
        <h2 className="font-serif text-4xl sm:text-5xl text-text font-normal tracking-tight mt-2">
          Designed for certainty.
        </h2>
        <p className="text-sm text-text-muted font-sans mt-3">
          No dashboards crowded with neon charts. Just the plain statement of what to do today.
        </p>
      </div>

      {/* 3 Z-Levels Floating Spatial Composition */}
      <div className="relative w-full max-w-5xl mx-auto" style={{ perspective: '1200px' }}>
        {/* Level 2: The Main Dashboard Plane (straightens on scroll) */}
        <motion.div
          style={prefersReducedMotion ? {} : { rotateZ: rotateVal }}
          className="relative w-full bg-surface/90 border border-hairline rounded-[20px] p-6 sm:p-10 shadow-soft"
        >
          {/* Mock overview header */}
          <div className="flex justify-between items-baseline border-b border-hairline pb-6">
            <div>
              <span className="text-xs uppercase text-text-muted font-sans font-medium">USD / INR Spot</span>
              <div className="font-serif text-3xl sm:text-4xl text-text font-light mt-1">₹86.4250</div>
            </div>
            <div className="text-xs text-text-muted font-sans">
              Alex Mercer · Zenith Forgings
            </div>
          </div>

          {/* Mock Hero Question */}
          <div className="py-8 max-w-xl">
            <h3 className="font-serif text-2xl sm:text-4xl text-text font-normal leading-[1.1]">
              Lock 80% of your November receivable today.
            </h3>
            <p className="text-xs text-text-muted font-sans mt-2">
              Forward premium pays +0.26 above spot. Secures ₹82.35L against rupee strength.
            </p>
          </div>

          {/* Mock Ledger row */}
          <div className="border-t border-hairline pt-6 grid grid-cols-3 gap-4 text-xs font-sans">
            <div>
              <div className="text-text-muted">Bank forward</div>
              <div className="font-serif text-xl text-text mt-1">₹86.6850</div>
            </div>
            <div>
              <div className="text-text-muted">Projected spot</div>
              <div className="font-serif text-xl text-text mt-1">₹86.7200</div>
            </div>
            <div>
              <div className="text-text-muted">Secured buffer</div>
              <div className="font-serif text-xl text-gain mt-1">₹82,175</div>
            </div>
          </div>
        </motion.div>

        {/* Level 3: Floating Spatial Quote Sheet drifting in front with its own parallax */}
        <motion.div
          style={
            prefersReducedMotion
              ? {}
              : {
                  y: sheetY,
                  scale: sheetScale,
                }
          }
          className="relative lg:absolute lg:right-6 lg:-bottom-12 mt-6 lg:mt-0 z-20 w-full lg:w-96 bg-surface-raised rounded-[20px] border border-hairlineStrong p-6 shadow-sheet"
        >
          <div className="flex justify-between items-center pb-3 border-b border-hairline">
            <span className="font-serif text-lg text-text">Review Quote</span>
            <span className="text-[11px] font-sans text-gain flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              Verified Quote
            </span>
          </div>

          <div className="py-4 space-y-3 text-xs font-sans">
            <div className="flex justify-between">
              <span className="text-text-muted">Receivable Amount:</span>
              <span className="text-text font-medium">$95,000 USD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Locked Bank Rate:</span>
              <span className="text-accent font-serif text-base">₹86.6850</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Guaranteed Inflow:</span>
              <span className="text-text font-serif text-base">₹82,35,075</span>
            </div>
          </div>

          <div className="pt-3 border-t border-hairline">
            <button className="w-full py-2.5 bg-accent hover:bg-accent-hover text-[#1C1A17] font-sans text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5">
              <span>Confirm & Lock Forward</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

