'use client';

import React from 'react';

interface Props {
  className?: string;
  size?: number;
}

/**
 * Handcrafted monoline geometric shield with an internal continuous folding loop,
 * referencing the Peerbound brand mood with a single accent line.
 */
export default function TradeShieldMark({ className = 'text-accent', size = 26 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer shield perimeter that folds inward at the top right into a continuous looping arrow */}
      <path
        d="M14 3.5C8.8 3.5 5 5.2 5 10V16C5 20.8 9 23.8 14 24.8C19 23.8 23 20.8 23 16V10C23 5.2 19.2 3.5 14 3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Monoline internal looping fold */}
      <path
        d="M10.5 11.2C10.5 9 12 7.5 14 7.5C16.2 7.5 17.5 9.2 17.5 11.5C17.5 14.5 14 17 14 17L10.5 13.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

