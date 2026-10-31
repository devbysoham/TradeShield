'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

const STORY_STEPS = [
  {
    step: 1,
    headline: 'You ship in September.',
    detail: 'Your buyer in Europe agrees to $95,000 payable upon discharge at Rotterdam.',
  },
  {
    step: 2,
    headline: 'The rupee moves for six weeks.',
    detail: 'While your container navigates around the Cape, INR strengthens from 86.42 to 85.12.',
  },
  {
    step: 3,
    headline: 'Your margin quietly disappears.',
    detail: 'The invoice is paid in full, yet your realization shrinks by over a lakh at your local bank branch.',
  },
];

function RupeeLossCounter({ scrollYProgress }: { scrollYProgress: any }) {
  const [lossText, setLossText] = useState('₹0 lost');

  useEffect(() => {
    return scrollYProgress.on('change', (latest: number) => {
      if (latest < 0.35) {
        setLossText('₹0 lost (at departure)');
      } else if (latest < 0.75) {
        setLossText('-₹48,200 lost (off Cape Coast)');
      } else {
        setLossText('-₹1,24,000 margin erased at settlement');
      }
    });
  }, [scrollYProgress]);

  return (
    <span className="font-serif text-sm tabular-nums text-accent font-normal">
      {lossText}
    </span>
  );
}

export default function StorySection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Timeline dot position from 0% to 100%
  const dotProgress = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  // Strictly monotonic offsets between 0 and 1 for each story step
  const opacity0 = useTransform(scrollYProgress, [0, 0.25, 0.4], [1, 1, 0.2]);
  const opacity1 = useTransform(scrollYProgress, [0.32, 0.52, 0.72], [0.2, 1, 0.2]);
  const opacity2 = useTransform(scrollYProgress, [0.65, 0.85, 1], [0.2, 1, 1]);

  const y0 = useTransform(scrollYProgress, [0, 0.25, 0.4], [0, 0, -6]);
  const y1 = useTransform(scrollYProgress, [0.32, 0.52, 0.72], [6, 0, -6]);
  const y2 = useTransform(scrollYProgress, [0.65, 0.85, 1], [6, 0, 0]);

  const stepStyles = [
    { opacity: prefersReducedMotion ? 1 : opacity0, y: prefersReducedMotion ? 0 : y0 },
    { opacity: prefersReducedMotion ? 1 : opacity1, y: prefersReducedMotion ? 0 : y1 },
    { opacity: prefersReducedMotion ? 1 : opacity2, y: prefersReducedMotion ? 0 : y2 },
  ];

  return (
    <section id="story" ref={containerRef} className="relative min-h-[220vh] bg-bg py-24 border-t border-hairline">
      {/* Sticky container */}
      <div className="sticky top-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col justify-between min-h-[60vh]">
        <div>
          <span className="text-xs uppercase tracking-wide text-text-muted font-sans font-medium">
            The Reality of Delayed Settlement
          </span>
          <h2 className="sr-only">How currency volatility erodes cross-border margins</h2>
        </div>

        {/* Dynamic swapping story text */}
        <div className="my-12 max-w-3xl space-y-4">
          {STORY_STEPS.map((s, idx) => (
            <motion.div
              key={idx}
              style={stepStyles[idx]}
              className="py-3 transition-opacity"
            >
              <h3 className="font-serif text-3xl sm:text-5xl lg:text-[52px] text-text font-normal tracking-tight leading-[1.1]">
                {s.headline}
              </h3>
              <p className="text-sm sm:text-base text-text-muted font-sans mt-2.5 max-w-xl leading-relaxed">
                {s.detail}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Horizontal timeline with advancing coral dot & changing rupee loss */}
        <div className="pt-8 border-t border-hairline space-y-4">
          <div className="relative w-full h-[2px] bg-surface-raised">
            {/* Animated progress bar */}
            <motion.div
              style={{ width: dotProgress }}
              className="absolute left-0 top-0 bottom-0 bg-accent"
            />
            {/* Advancing coral dot */}
            <motion.div
              style={{ left: dotProgress }}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-accent ring-4 ring-bg shadow-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-sans text-text-muted">
            <div className="flex items-center gap-6">
              <span>Bill of Lading issued</span>
              <span className="text-hairlineStrong">•</span>
              <span className="text-text-faint">Cape transit (42 days)</span>
              <span className="text-hairlineStrong">•</span>
              <span>Rotterdam discharge</span>
            </div>

            {/* Dynamic Rupee loss counter changing with scroll */}
            <div className="flex items-center gap-2">
              <span className="text-text-muted">Financial impact:</span>
              <RupeeLossCounter scrollYProgress={scrollYProgress} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
