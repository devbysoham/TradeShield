'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  state: 'pending' | 'error';
  onRetry?: () => void;
}

export default function ForecastStateIllustration({ state, onRetry }: Props) {
  const isPending = state === 'pending';

  return (
    <div className="w-full h-[360px] flex flex-col items-center justify-center p-6 text-center select-none">
      {/* Handcrafted single-line vessel & wave illustration in logomark stroke style */}
      <svg
        width="84"
        height="56"
        viewBox="0 0 84 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mb-4"
      >
        {/* Vessel hull in 1.5px monoline stroke */}
        <motion.path
          d="M26 28L31 38H53L58 28H26Z"
          stroke="#F0445A"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9 }}
        />
        {/* Mast and cargo contour */}
        <path
          d="M42 16V28M42 20H49L42 14"
          stroke="#E8E6E1"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Continuous or broken wave line */}
        {isPending ? (
          <motion.path
            d="M6 44C18 44 22 41 32 41C42 41 46 44 56 44C66 44 70 41 78 41"
            stroke="#9E9A90"
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse' }}
          />
        ) : (
          <path
            d="M6 44C16 44 20 41 28 41M36 41C44 41 48 44 56 44M64 44C70 44 74 41 78 41"
            stroke="#6E6A62"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="4 3"
          />
        )}
      </svg>

      {/* Human text */}
      <div className="max-w-sm space-y-2">
        <p className="font-serif text-lg text-text">
          {isPending
            ? "Pulling in this morning's rates."
            : "We couldn't reach the rate feed. Showing yesterday's close."}
        </p>

        {!isPending && onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-accent hover:underline font-sans pt-1 inline-block"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

