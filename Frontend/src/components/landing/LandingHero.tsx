'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Figure from '../primitives/Figure';
import TradeShieldMark from '../primitives/TradeShieldMark';
import { CUBIC_EASE } from '../primitives/Reveal';

export default function LandingHero() {
  const prefersReducedMotion = useReducedMotion();
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 6; // 2-6px
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 6;
    setParallax({ x, y });
  };

  const handleMouseLeave = () => {
    setParallax({ x: 0, y: 0 });
  };

  return (
    <section
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-between pt-12 sm:pt-20 pb-16 overflow-hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      {/* Oversized cropped logomark in background at ~6% opacity */}
      <div
        style={{
          transform: `translate3d(${-parallax.x * 1.5}px, ${-parallax.y * 1.5}px, 0)`,
          transition: 'transform 0.2s ease-out',
        }}
        className="absolute -right-24 -top-12 pointer-events-none opacity-[0.05] select-none hidden lg:block"
      >
        <TradeShieldMark size={580} className="text-text" />
      </div>

      <div className="relative z-10 max-w-4xl">
        {/* Headline: 3 lines revealed from masks with 70ms stagger */}
        <div
          style={{
            transform: `translate3d(${parallax.x}px, ${parallax.y}px, 0)`,
            transition: 'transform 0.15s ease-out',
          }}
          className="space-y-1 sm:space-y-2 select-none"
        >
          {/* Line 1 */}
          <div className="overflow-hidden">
            <motion.h1
              initial={{ y: '105%', opacity: 0 }}
              animate={{ y: '0%', opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.05, ease: CUBIC_EASE }}
              className="font-serif text-5xl sm:text-7xl lg:text-[104px] text-text font-normal tracking-tight leading-[1.02]"
            >
              Get paid
            </motion.h1>
          </div>

          {/* Line 2 */}
          <div className="overflow-hidden">
            <motion.h1
              initial={{ y: '105%', opacity: 0 }}
              animate={{ y: '0%', opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.12, ease: CUBIC_EASE }}
              className="font-serif text-5xl sm:text-7xl lg:text-[104px] text-text font-normal tracking-tight leading-[1.02]"
            >
              what you were
            </motion.h1>
          </div>

          {/* Line 3 with coral italic */}
          <div className="overflow-hidden">
            <motion.h1
              initial={{ y: '105%', opacity: 0 }}
              animate={{ y: '0%', opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.19, ease: CUBIC_EASE }}
              className="font-serif text-5xl sm:text-7xl lg:text-[104px] text-text font-normal tracking-tight leading-[1.02]"
            >
              <span className="text-accent italic font-serif">promised</span>.
            </motion.h1>
          </div>
        </div>

        {/* One muted sentence */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: CUBIC_EASE }}
          className="text-base sm:text-lg text-text-muted font-sans mt-8 sm:mt-10 max-w-2xl leading-relaxed"
        >
          TradeShield helps small exporters and importers protect their margin between the day a shipment leaves and the day the money arrives.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45, ease: CUBIC_EASE }}
          className="mt-8 sm:mt-10 flex items-center gap-4"
        >
          <Link
            href="/overview"
            className="bg-accent hover:bg-accent-hover text-[#1C1A17] font-sans text-sm font-medium px-6 py-3.5 rounded-lg transition-colors flex items-center gap-2 group"
          >
            <span>Start free</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
          </Link>
          <span className="text-xs text-text-faint font-sans">
            No credit card · Live in two minutes
          </span>
        </motion.div>
      </div>

      {/* Right side / beneath: Live USD/INR serif figure + Drawing forecast band */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.55, ease: CUBIC_EASE }}
        className="mt-16 sm:mt-20 pt-8 border-t border-hairline grid grid-cols-1 md:grid-cols-12 gap-8 items-end"
      >
        {/* Live figure */}
        <div className="md:col-span-5 space-y-2">
          <div className="text-xs uppercase tracking-wider text-text-muted font-sans font-medium">
            Live USD / INR Reference
          </div>
          <div className="font-serif text-4xl sm:text-5xl text-text font-light tracking-tight tabular-nums">
            <Figure value={86.4250} prefix="₹" decimals={4} duration={1.2} />
          </div>
          <div className="text-xs text-text-muted font-sans">
            +0.1420 today (+0.16%) · RBI Reference 86.3810
          </div>
        </div>

        {/* Thin drawing forecast band SVG beside it */}
        <div className="md:col-span-7 relative h-28 flex flex-col justify-end">
          <div className="absolute top-0 left-0 right-0 flex justify-between text-[11px] text-text-muted font-sans">
            <span>Today</span>
            <span className="text-accent">Payment due in 15 days (Nov 14)</span>
          </div>

          <svg
            viewBox="0 0 420 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-20 overflow-visible"
          >
            {/* Shaded confidence band */}
            <motion.path
              d="M10 55 C 80 50, 160 46, 210 44 C 280 40, 340 30, 410 20 L 410 65 C 340 60, 280 55, 210 52 C 160 50, 80 52, 10 55 Z"
              fill="#F0445A"
              fillOpacity="0.12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.0, delay: 0.8 }}
            />

            {/* Dashed no-change baseline */}
            <line
              x1="10"
              y1="55"
              x2="410"
              y2="55"
              stroke="#6E6A62"
              strokeWidth="1"
              strokeDasharray="4 4"
            />

            {/* Historical line (off-white) */}
            <motion.path
              d="M10 62 L 60 58 L 110 60 L 160 54 L 210 52"
              stroke="#E8E6E1"
              strokeWidth="1.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, delay: 0.6, ease: CUBIC_EASE }}
            />

            {/* Projected median corridor (coral) */}
            <motion.path
              d="M210 52 C 260 48, 310 42, 360 36 L 410 28"
              stroke="#F0445A"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, delay: 1.1, ease: CUBIC_EASE }}
            />

            {/* Today marker dot */}
            <circle cx="210" cy="52" r="3" fill="#E8E6E1" />

            {/* Receivable due date dot */}
            <circle cx="410" cy="28" r="4" fill="#F0445A" />
          </svg>
        </div>
      </motion.div>
    </section>
  );
}

