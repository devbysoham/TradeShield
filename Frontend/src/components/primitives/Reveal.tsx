'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  yOffset?: number;
}

export const CUBIC_EASE = [0.22, 1, 0.36, 1] as const;

export default function Reveal({
  children,
  delay = 0,
  duration = 0.7,
  className = '',
  yOffset = 100,
}: RevealProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      <motion.div
        initial={{ y: `${yOffset}%`, opacity: 0.001 }}
        animate={{ y: '0%', opacity: 1 }}
        transition={{
          duration,
          delay,
          ease: CUBIC_EASE,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

