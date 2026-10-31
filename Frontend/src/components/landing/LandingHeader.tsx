'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import TradeShieldMark from '../primitives/TradeShieldMark';

export default function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#1C1A17]/85 backdrop-blur-md border-b border-hairline">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand with shared layoutIds for seamless handoff */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <motion.div layoutId="brand-logo" className="text-accent transition-transform duration-300 group-hover:scale-105">
            <TradeShieldMark size={24} />
          </motion.div>
          <motion.span layoutId="brand-wordmark" className="font-serif text-xl font-normal tracking-tight text-text">
            TradeShield
          </motion.span>
        </Link>

        {/* Center: Quiet navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-sans text-text-muted">
          <a href="#story" className="hover:text-text transition-colors">
            How it works
          </a>
          <a href="#what-it-does" className="hover:text-text transition-colors">
            Capabilities
          </a>
          <a href="#doors" className="hover:text-text transition-colors">
            Exporters & Importers
          </a>
        </nav>

        {/* Right: Sign in & Start free */}
        <div className="flex items-center gap-5">
          <Link
            href="/overview"
            className="text-xs sm:text-sm font-sans text-text-muted hover:text-text transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/overview"
            className="bg-accent hover:bg-accent-hover text-[#1C1A17] font-sans text-xs sm:text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}

