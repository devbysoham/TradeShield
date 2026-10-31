'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CUBIC_EASE } from './Reveal';

interface ActionButtonProps {
  idleLabel: string;
  loadingLabel: string;
  successLabel?: string;
  onAction: () => Promise<void> | void;
  className?: string;
}

export default function ActionButton({
  idleLabel,
  loadingLabel,
  successLabel = 'Completed',
  onAction,
  className = '',
}: ActionButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleClick = async () => {
    if (status !== 'idle') return;
    setStatus('loading');
    try {
      await onAction();
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
      }, 2400);
    } catch {
      setStatus('idle');
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={status !== 'idle'}
      className={`relative inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-sans font-medium transition-all ${
        status === 'success'
          ? 'bg-gain text-[#1C1A17]'
          : 'bg-accent hover:bg-accent-hover text-[#1C1A17]'
      } ${className}`}
    >
      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.span
            key="idle"
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.2, ease: CUBIC_EASE }}
          >
            {idleLabel}
          </motion.span>
        )}

        {status === 'loading' && (
          <motion.span
            key="loading"
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.2, ease: CUBIC_EASE }}
            className="inline-flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-[#1C1A17] animate-ping" />
            <span>{loadingLabel}</span>
          </motion.span>
        )}

        {status === 'success' && (
          <motion.span
            key="success"
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.2, ease: CUBIC_EASE }}
            className="inline-flex items-center gap-2"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <motion.path
                d="M2.5 7.5L5.5 10.5L11.5 3.5"
                stroke="#1C1A17"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, ease: CUBIC_EASE }}
              />
            </svg>
            <span>{successLabel}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

