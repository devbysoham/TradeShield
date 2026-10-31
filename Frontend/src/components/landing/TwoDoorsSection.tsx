'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useRole } from '../../lib/RoleContext';

export default function TwoDoorsSection() {
  const { setRole } = useRole();
  const [hoveredDoor, setHoveredDoor] = useState<'export' | 'import' | null>(null);

  return (
    <section id="doors" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 border-t border-hairline">
      <div className="mb-12">
        <span className="text-xs uppercase tracking-wide text-text-muted font-sans font-medium">
          Choose Your Perspective
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl text-text font-normal tracking-tight mt-1">
          Two doors into TradeShield.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[380px]">
        {/* Door 1: Exporter */}
        <Link
          href="/overview"
          onClick={() => setRole('exporter')}
          onMouseEnter={() => setHoveredDoor('export')}
          onMouseLeave={() => setHoveredDoor(null)}
          className={`relative p-8 sm:p-12 rounded-[20px] border border-hairline bg-surface/60 flex flex-col justify-between transition-all duration-300 group cursor-pointer ${
            hoveredDoor === 'import' ? 'opacity-40' : 'opacity-100'
          }`}
        >
          <div>
            <span className="text-xs uppercase tracking-wider text-text-muted font-sans font-medium">
              For Indian Exporters
            </span>
            <h3 className="font-serif text-4xl sm:text-5xl text-text font-normal tracking-tight mt-4 group-hover:text-accent transition-colors">
              I export.
            </h3>
            <p className="text-sm sm:text-base text-text-muted font-sans mt-4 max-w-sm leading-relaxed">
              Lock your dollar and euro receivables against sudden rupee rallies before your overseas buyer settles.
            </p>
          </div>

          <div className="pt-8 flex items-center justify-between">
            <span className="relative text-sm font-sans text-text font-medium">
              <span>Open exporter workspace</span>
              <motion.span
                className="absolute left-0 bottom-0 right-0 h-[1.5px] bg-accent"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: hoveredDoor === 'export' ? 1 : 0 }}
                transition={{ duration: 0.25 }}
              />
            </span>
            <ArrowUpRight className="w-5 h-5 text-accent transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
          </div>
        </Link>

        {/* Door 2: Importer */}
        <Link
          href="/overview"
          onClick={() => setRole('importer')}
          onMouseEnter={() => setHoveredDoor('import')}
          onMouseLeave={() => setHoveredDoor(null)}
          className={`relative p-8 sm:p-12 rounded-[20px] border border-hairline bg-surface/60 flex flex-col justify-between transition-all duration-300 group cursor-pointer ${
            hoveredDoor === 'export' ? 'opacity-40' : 'opacity-100'
          }`}
        >
          <div>
            <span className="text-xs uppercase tracking-wider text-text-muted font-sans font-medium">
              For Indian Importers
            </span>
            <h3 className="font-serif text-4xl sm:text-5xl text-text font-normal tracking-tight mt-4 group-hover:text-accent transition-colors">
              I import.
            </h3>
            <p className="text-sm sm:text-base text-text-muted font-sans mt-4 max-w-sm leading-relaxed">
              Cap landed procurement outlays before dollar breakouts erode your local manufacturing margins.
            </p>
          </div>

          <div className="pt-8 flex items-center justify-between">
            <span className="relative text-sm font-sans text-text font-medium">
              <span>Open importer workspace</span>
              <motion.span
                className="absolute left-0 bottom-0 right-0 h-[1.5px] bg-accent"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: hoveredDoor === 'import' ? 1 : 0 }}
                transition={{ duration: 0.25 }}
              />
            </span>
            <ArrowUpRight className="w-5 h-5 text-accent transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
          </div>
        </Link>
      </div>
    </section>
  );
}

