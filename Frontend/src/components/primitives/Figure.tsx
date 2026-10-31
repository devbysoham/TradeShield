'use client';

import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface FigureProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  formatIndian?: boolean;
  className?: string;
  serif?: boolean;
  duration?: number;
}

export function formatIndianNumber(num: number, decimals: number = 0): string {
  if (isNaN(num)) return '0';
  const parts = num.toFixed(decimals).split('.');
  let integerPart = parts[0];
  const decimalPart = parts.length > 1 ? `.${parts[1]}` : '';

  // Indian number grouping: last 3 digits, then groups of 2 digits
  const lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  } else {
    integerPart = lastThree;
  }

  return `${integerPart}${decimalPart}`;
}

export default function Figure({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  formatIndian = false,
  className = '',
  serif = true,
  duration = 1.0,
}: FigureProps) {
  const prefersReducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState<number>(prefersReducedMotion ? value : 0);

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }

    let startTime: number | null = null;
    const startVal = 0;
    const endVal = value;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      // Easing curve: [0.22, 1, 0.36, 1] approximation
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * ease;
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(endVal);
      }
    };

    const frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [value, duration, prefersReducedMotion]);

  const formatted = formatIndian
    ? formatIndianNumber(displayValue, decimals)
    : displayValue.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

  return (
    <span
      className={`tabular-nums inline-block ${serif ? 'font-serif' : 'font-sans'} ${className}`}
    >
      {prefix}
      {formatted}
      {suffix && <span className="text-text-muted text-[0.65em] font-sans ml-1">{suffix}</span>}
    </span>
  );
}

