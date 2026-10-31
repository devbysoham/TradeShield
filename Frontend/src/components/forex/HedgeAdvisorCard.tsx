'use client';

import React from 'react';
import { AdvisorRecommendation } from '../../types';
import { Lightbulb, ArrowRight, ShieldCheck, CheckCircle } from 'lucide-react';

interface Props {
  recommendation: AdvisorRecommendation;
}

export default function HedgeAdvisorCard({ recommendation }: Props) {
  const isCoral = recommendation.badgeType === 'coral';

  return (
    <div className={`p-4 rounded-2xl border backdrop-blur-md shadow-xl ${
      isCoral
        ? 'bg-rose-950/40 border-rose-500/40'
        : 'bg-emerald-950/30 border-emerald-500/30'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${
            isCoral ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
          }`}>
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block">
              AI Hedging Advisory Engine
            </span>
            <h4 className="text-xs font-bold text-slate-100">
              {recommendation.headline}
            </h4>
          </div>
        </div>

        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold self-start sm:self-auto border ${
          isCoral
            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
        }`}>
          {recommendation.badge}
        </span>
      </div>

      <div className="space-y-2 text-xs">
        <p className="text-slate-300 text-[11px] leading-relaxed">
          {recommendation.reasoning}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1.5 px-3 bg-black/30 rounded-xl font-mono text-[11px]">
          <div>
            <span className="text-slate-500 block text-[9px]">Target Exposure</span>
            <span className="text-slate-200 font-medium truncate block">
              {recommendation.exposureTarget.split(' ')[0]}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px]">Bank Quote</span>
            <span className="text-emerald-400 font-bold">
              ₹{recommendation.bankForwardQuote.toFixed(4)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px]">Expected Spot</span>
            <span className="text-cyan-400 font-medium">
              ₹{recommendation.expectedSpot.toFixed(4)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px]">Protected Margin</span>
            <span className="text-emerald-300 font-semibold truncate block">
              {recommendation.downsideRiskProtected.split(' ')[0]}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 text-xs">
          <span className="text-[11px] text-slate-300 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            Suggested: <span className="font-semibold text-slate-100">{recommendation.suggestedAction}</span>
          </span>
          <button className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-[11px] flex items-center gap-1 transition-colors">
            <span>Execute Quote</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

