'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { CUBIC_EASE } from './Reveal';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Sheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-xl',
}: SheetProps) {
  // Listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Dimmed backdrop with slight blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: CUBIC_EASE }}
            onClick={onClose}
            className="fixed inset-0 bg-[#141210]/80 backdrop-blur-[2px]"
          />

          {/* Floating Spatial Sheet */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 28,
            }}
            className={`relative w-full ${maxWidth} bg-surface rounded-[20px] border border-hairline shadow-sheet overflow-hidden z-10`}
          >
            {/* Header */}
            {(title || subtitle) && (
              <div className="px-6 pt-6 pb-4 border-b border-hairline flex items-start justify-between">
                <div>
                  {title && (
                    <h3 className="font-serif text-2xl text-text font-normal tracking-tight">
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                      {subtitle}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 text-text-muted hover:text-text hover:bg-surface-raised rounded-lg transition-colors -mr-1"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            )}

            {/* Sheet body */}
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

