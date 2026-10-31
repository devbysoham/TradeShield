'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CUBIC_EASE } from '../primitives/Reveal';

export default function TrustSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 border-t border-hairline">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-4">
          <span className="text-xs uppercase tracking-wide text-text-muted font-sans font-medium">
            Cryptographic Integrity
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl text-text font-normal tracking-tight mt-1">
            Trust without badges.
          </h2>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <p className="text-base sm:text-lg text-text font-sans leading-relaxed max-w-2xl">
            Every forward booking and shipment manifest is cryptographically hashed at the moment of agreement. If a single tare weight or invoice clause changes downstream, the audit chain flags the difference before your bank settles.
          </p>

          {/* Tiny real hash string in mono that visibly verifies with a check drawn once in view */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.6, ease: CUBIC_EASE }}
            className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2"
          >
            <div className="flex items-center gap-2.5 px-3 py-2 rounded bg-surface border border-hairline w-fit">
              <span className="font-mono text-xs text-text-muted truncate max-w-[280px] sm:max-w-md select-all">
                e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
              </span>

              {/* Check mark drawn via pathLength */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0 text-gain"
              >
                <motion.path
                  d="M3 8.5L6.5 12L13 4"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true, margin: '-10%' }}
                  transition={{ duration: 0.8, delay: 0.3, ease: CUBIC_EASE }}
                />
              </svg>
            </div>

            <span className="text-xs text-text-faint font-sans">
              DGFT ICEGATE notarized SHA-256
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

