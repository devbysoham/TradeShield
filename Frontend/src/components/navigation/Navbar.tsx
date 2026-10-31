'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Bell, RefreshCw, ChevronDown, User, Globe } from 'lucide-react';
import { useForexData } from '../../lib/api';

export default function Navbar() {
  const { rates, mutate } = useForexData();
  const usdInr = rates['USD/INR'];
  const eurInr = rates['EUR/INR'];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-navy-midnight/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-emerald-400 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <div className="h-full w-full bg-navy-midnight rounded-[10px] flex items-center justify-center">
                <Shield className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-slate-100 flex items-center gap-1">
                Trade<span className="text-cyan-400">SHIELD</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400 block -mt-1">
                FX Risk & Trade Integrity
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Live FX Ticker */}
        <div className="hidden md:flex items-center gap-4 bg-navy-deep/80 px-4 py-1.5 rounded-full border border-slate-800/90 text-xs shadow-inner">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Globe className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            <span className="text-[11px] font-medium">RBI FX Feed:</span>
          </div>

          {usdInr && (
            <div className="flex items-center gap-2 font-mono">
              <span className="text-slate-300 font-semibold">USD/INR</span>
              <span className="text-slate-100 font-bold">₹{usdInr.spot.toFixed(4)}</span>
              <span className={`text-[10px] px-1 py-0.2 rounded font-bold ${
                usdInr.changeDay >= 0 ? 'text-emerald-400 bg-emerald-950/60' : 'text-rose-400 bg-rose-950/60'
              }`}>
                {usdInr.changeDay >= 0 ? '+' : ''}{usdInr.changeDay.toFixed(4)} ({usdInr.changePercent}%)
              </span>
            </div>
          )}

          {eurInr && (
            <div className="hidden lg:flex items-center gap-2 font-mono pl-3 border-l border-slate-700/60">
              <span className="text-slate-300 font-semibold">EUR/INR</span>
              <span className="text-slate-100 font-bold">₹{eurInr.spot.toFixed(4)}</span>
              <span className={`text-[10px] px-1 py-0.2 rounded font-bold ${
                eurInr.changeDay >= 0 ? 'text-emerald-400 bg-emerald-950/60' : 'text-rose-400 bg-rose-950/60'
              }`}>
                {eurInr.changeDay >= 0 ? '+' : ''}{eurInr.changeDay.toFixed(4)}
              </span>
            </div>
          )}

          <button
            onClick={() => mutate()}
            className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-cyan-300 transition-colors"
            title="Refresh FX quote"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        {/* Right: User / Alerts */}
        <div className="flex items-center gap-3">
          <button className="relative p-2 rounded-xl bg-navy-deep/80 border border-slate-800 text-slate-300 hover:text-white transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
          </button>

          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-xs">
              AM
            </div>
            <div className="hidden sm:block text-left text-xs">
              <span className="font-semibold text-slate-200 block">Alex Mercer</span>
              <span className="text-[10px] text-slate-400 block -mt-0.5">Zenith Forgings (Exporter)</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

