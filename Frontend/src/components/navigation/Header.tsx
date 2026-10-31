'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import TradeShieldMark from '../primitives/TradeShieldMark';
import { useRole } from '../../lib/RoleContext';

const NAV_LINKS = [
  { name: 'Overview', href: '/overview' },
  { name: 'Forecast', href: '/forex' },
  { name: 'Shipments', href: '/shipments' },
  { name: 'Documents', href: '/contracts' },
  { name: 'Compliance', href: '/compliance' },
];

export default function Header() {
  const pathname = usePathname();
  const { role, setRole } = useRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Landing page ('/') has its own dedicated editorial top bar with How it works / Exporters / Importers
  if (pathname === '/') {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-[#1C1A17]/90 backdrop-blur-md border-b border-hairline">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <TradeShieldMark className="text-accent transition-transform duration-300 group-hover:scale-105" size={24} />
            <span className="font-serif text-xl font-normal tracking-tight text-text">
              TradeShield
            </span>
          </Link>
        </div>

        {/* Center: Quiet text-only nav with sliding underline */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative py-1 text-sm font-sans transition-colors ${
                  isActive ? 'text-text font-medium' : 'text-text-muted hover:text-text'
                }`}
              >
                <span>{link.name}</span>
                {isActive && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute -bottom-1 left-0 right-0 h-[1.5px] bg-accent"
                    transition={{ type: 'spring', stiffness: 280, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: Role text toggle & user avatar */}
        <div className="hidden sm:flex items-center gap-6">
          {/* Exporter / Importer text toggle with sliding underline */}
          <div className="flex items-center gap-4 text-xs font-sans">
            <button
              onClick={() => setRole('exporter')}
              className={`relative py-1 transition-colors ${
                role === 'exporter' ? 'text-text font-medium' : 'text-text-muted hover:text-text'
              }`}
            >
              <span>Exporter</span>
              {role === 'exporter' && (
                <motion.div
                  layoutId="role-underline"
                  className="absolute -bottom-0.5 left-0 right-0 h-[1.5px] bg-accent"
                  transition={{ type: 'spring', stiffness: 280, damping: 30 }}
                />
              )}
            </button>

            <span className="text-hairlineStrong">/</span>

            <button
              onClick={() => setRole('importer')}
              className={`relative py-1 transition-colors ${
                role === 'importer' ? 'text-text font-medium' : 'text-text-muted hover:text-text'
              }`}
            >
              <span>Importer</span>
              {role === 'importer' && (
                <motion.div
                  layoutId="role-underline"
                  className="absolute -bottom-0.5 left-0 right-0 h-[1.5px] bg-accent"
                  transition={{ type: 'spring', stiffness: 280, damping: 30 }}
                />
              )}
            </button>
          </div>

          {/* Quiet User Initial */}
          <div className="flex items-center gap-2.5 pl-4 border-l border-hairline">
            <span className="text-xs text-text-muted font-sans hidden lg:inline">Alex Mercer</span>
            <div className="w-7 h-7 rounded-full bg-surface-raised border border-hairline flex items-center justify-center text-xs font-sans text-text-muted">
              AM
            </div>
          </div>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex sm:hidden items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-text-muted hover:text-text"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="sm:hidden border-b border-hairline bg-surface px-6 py-4 space-y-4"
          >
            <div className="flex flex-col space-y-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-sm py-1.5 ${
                    pathname === link.href ? 'text-accent font-medium' : 'text-text-muted'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            <div className="pt-3 border-t border-hairline flex items-center justify-between text-xs">
              <span className="text-text-muted">Perspective:</span>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setRole('exporter');
                    setMobileMenuOpen(false);
                  }}
                  className={role === 'exporter' ? 'text-accent font-medium' : 'text-text-muted'}
                >
                  Exporter
                </button>
                <span className="text-hairlineStrong">/</span>
                <button
                  onClick={() => {
                    setRole('importer');
                    setMobileMenuOpen(false);
                  }}
                  className={role === 'importer' ? 'text-accent font-medium' : 'text-text-muted'}
                >
                  Importer
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

