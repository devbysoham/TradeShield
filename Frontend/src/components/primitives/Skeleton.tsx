'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function SkeletonBlock({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden bg-surface-raised/80 rounded-lg ${className}`}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent pointer-events-none"
      />
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="w-full pt-8 sm:pt-12 pb-6 animate-pulse">
      {/* Live rate header placeholder */}
      <div className="flex justify-between items-baseline pb-8 border-b border-hairline">
        <div className="flex items-baseline gap-4">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-10 w-36" />
        </div>
        <SkeletonBlock className="h-4 w-48" />
      </div>

      {/* Headline placeholder */}
      <div className="pt-12 sm:pt-16 pb-8 space-y-4 max-w-3xl">
        <SkeletonBlock className="h-14 sm:h-16 w-full rounded-[14px]" />
        <SkeletonBlock className="h-14 sm:h-16 w-3/4 rounded-[14px]" />
        <div className="flex items-center gap-6 pt-4">
          <SkeletonBlock className="h-11 w-36 rounded-lg" />
          <SkeletonBlock className="h-5 w-80" />
        </div>
      </div>

      {/* 3-column data row placeholder */}
      <div className="mt-8 pt-8 border-t border-hairline grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-0">
        <div className="sm:pr-8 sm:border-r border-hairline space-y-2">
          <SkeletonBlock className="h-3.5 w-32" />
          <SkeletonBlock className="h-8 w-28" />
          <SkeletonBlock className="h-3 w-40" />
        </div>
        <div className="sm:px-8 sm:border-r border-hairline space-y-2">
          <SkeletonBlock className="h-3.5 w-28" />
          <SkeletonBlock className="h-8 w-28" />
          <SkeletonBlock className="h-3 w-36" />
        </div>
        <div className="sm:pl-8 space-y-2">
          <SkeletonBlock className="h-3.5 w-36" />
          <SkeletonBlock className="h-8 w-24" />
          <SkeletonBlock className="h-3 w-44" />
        </div>
      </div>
    </div>
  );
}

export function LedgerSkeleton() {
  return (
    <div className="w-full border-y border-hairline py-8 sm:py-10 my-12 sm:my-16">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0">
        <div className="lg:pr-8 lg:border-r border-hairline space-y-3">
          <SkeletonBlock className="h-3.5 w-28" />
          <SkeletonBlock className="h-11 w-44" />
          <SkeletonBlock className="h-3 w-36" />
        </div>
        <div className="lg:px-8 lg:border-r border-hairline space-y-3">
          <SkeletonBlock className="h-3.5 w-28" />
          <SkeletonBlock className="h-9 w-28" />
          <SkeletonBlock className="h-3 w-40" />
        </div>
        <div className="lg:px-8 lg:border-r border-hairline space-y-3">
          <SkeletonBlock className="h-3.5 w-28" />
          <SkeletonBlock className="h-9 w-32" />
          <SkeletonBlock className="h-3 w-48" />
        </div>
        <div className="lg:pl-8 space-y-3">
          <SkeletonBlock className="h-3.5 w-28" />
          <SkeletonBlock className="h-9 w-28" />
          <SkeletonBlock className="h-3 w-44" />
        </div>
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="w-full my-12 sm:my-16 space-y-4">
      <div className="flex justify-between items-baseline mb-6">
        <div className="space-y-2">
          <SkeletonBlock className="h-3.5 w-24" />
          <SkeletonBlock className="h-8 w-72" />
        </div>
        <SkeletonBlock className="h-4 w-48" />
      </div>

      {/* Chart canvas shape with baseline */}
      <div className="w-full h-[400px] border-b border-hairline relative flex flex-col justify-between py-6">
        <div className="w-full border-b border-hairline/40 border-dashed" />
        <div className="w-full border-b border-hairline/60 border-dashed" />
        <div className="w-full border-b border-hairline/40 border-dashed" />
        <div className="w-full border-b border-accent/20 border-dashed" />
        <div className="w-full border-b border-hairline/40 border-dashed" />
      </div>

      <div className="flex justify-between text-xs pt-3">
        <SkeletonBlock className="h-3.5 w-64" />
        <SkeletonBlock className="h-3.5 w-48" />
      </div>
    </div>
  );
}

