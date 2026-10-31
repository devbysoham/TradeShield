'use client';

import React from 'react';
import { useShipments } from '../../lib/api';
import ShipmentJourneyFlow from './ShipmentJourneyFlow';
import { Ship, Compass, AlertTriangle, ShieldCheck, MapPin } from 'lucide-react';

export default function ShipmentsPageView() {
  const { shipments } = useShipments();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2.5 text-xs font-mono text-blue-400 mb-1">
          <Ship className="w-4 h-4" />
          <span>REACT FLOW (@xyflow/react v12) LOGISTICS TOPOLOGY</span>
        </div>
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">
          Maritime Shipment Journeys & Maritime Alert Topology
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl">
          Visual waypoint routing through major maritime corridors with real-time AIS transponder feeds,
          harbor dwell congestion monitors, and meteorological storm alerts.
        </p>
      </div>

      {/* Main React Flow Canvas */}
      <ShipmentJourneyFlow shipments={shipments} />

      {/* Fleet Overview Table */}
      <div className="bg-navy-deep/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Active Trade Fleet Tracking Ledger
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {shipments.length} Vessels Tracking
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="pb-2">Reference</th>
                <th className="pb-2">Corridor (Origin → Dest)</th>
                <th className="pb-2">Carrier & Vessel</th>
                <th className="pb-2">ETA</th>
                <th className="pb-2">Cargo Value</th>
                <th className="pb-2">Risk Level</th>
                <th className="pb-2 text-right">Cost Exposure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {shipments.map((s) => (
                <tr key={s.id} className="hover:bg-navy-surface/40 transition-colors">
                  <td className="py-3 font-bold text-cyan-300">{s.reference}</td>
                  <td className="py-3 text-slate-200">
                    {s.origin.split(',')[0]} → {s.destination.split(',')[0]}
                  </td>
                  <td className="py-3 text-slate-300">{s.carrier}</td>
                  <td className="py-3 text-slate-400">{s.estimatedArrival}</td>
                  <td className="py-3 text-emerald-400 font-bold">
                    ${s.associatedInvoiceUSD.toLocaleString()} USD
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      s.riskLevel === 'Low' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' :
                      s.riskLevel === 'Moderate' ? 'bg-amber-950/80 text-amber-300 border border-amber-800' :
                      'bg-rose-950/80 text-rose-300 border border-rose-800'
                    }`}>
                      {s.riskLevel} ({s.riskScore}/100)
                    </span>
                  </td>
                  <td className="py-3 text-right text-rose-300 font-bold">
                    {s.costExposureEstimate.split(' ')[0]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

