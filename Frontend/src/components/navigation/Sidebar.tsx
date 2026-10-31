'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Ship, 
  FileCheck, 
  ShieldAlert, 
  Cpu, 
  History 
} from 'lucide-react';

const navItems = [
  {
    name: 'Overview Dashboard',
    href: '/',
    icon: LayoutDashboard,
    badge: 'Live',
  },
  {
    name: 'USD/INR 15D Forecast',
    href: '/forex',
    icon: TrendingUp,
    badge: 'Recharts',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  },
  {
    name: 'Shipment Journeys',
    href: '/shipments',
    icon: Ship,
    badge: 'React Flow',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  {
    name: 'Contract & Documents',
    href: '/contracts',
    icon: FileCheck,
    badge: 'React Flow',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-navy-midnight/90 flex flex-col justify-between shrink-0 p-4">
      <div className="space-y-6">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold px-3 block mb-2">
            Navigation
          </span>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-navy-surface text-cyan-300 border border-slate-700/80 shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-navy-surface/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                        item.badgeColor || 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Engine Status Block */}
        <div className="p-3 bg-navy-deep/80 rounded-xl border border-slate-800/90 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-200">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <Cpu className="w-3.5 h-3.5" /> Engine v2.4 Active
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Calibrated against RBI reference rates & AIS vessel transponders.
          </p>
          <div className="pt-2 border-t border-slate-800 flex justify-between text-[10px] font-mono text-slate-400">
            <span>Accuracy: 64.2%</span>
            <span>Brier: 0.182</span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-800/80 text-[10px] text-slate-500 text-center font-mono">
        TradeSHIELD • Next.js App Router
      </div>
    </aside>
  );
}

