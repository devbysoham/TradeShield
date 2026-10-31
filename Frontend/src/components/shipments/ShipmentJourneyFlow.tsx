'use client';

import React, { useState, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react';
import WaypointNode, { WaypointNodeData } from './nodes/WaypointNode';
import PortCongestionNode, { PortCongestionNodeData } from './nodes/PortCongestionNode';
import WeatherAlertNode, { WeatherAlertNodeData } from './nodes/WeatherAlertNode';
import { Shipment } from '../../types';
import { Anchor, Navigation, AlertTriangle, ShieldCheck, Compass, Info } from 'lucide-react';

interface Props {
  shipments: Shipment[];
}

export default function ShipmentJourneyFlow({ shipments }: Props) {
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>(
    shipments[0]?.id || 'TS-SHP-2026-0891'
  );

  const activeShipment = useMemo(() => {
    return shipments.find((s) => s.id === selectedShipmentId) || shipments[0];
  }, [shipments, selectedShipmentId]);

  // Register Custom Flow Nodes
  const nodeTypes = useMemo(
    () => ({
      waypoint: WaypointNode,
      portCongestion: PortCongestionNode,
      weatherAlert: WeatherAlertNode,
    }),
    []
  );

  // Generate reactive nodes and edges tailored to the active shipment
  const { nodes, edges } = useMemo(() => {
    if (!activeShipment) return { nodes: [], edges: [] };

    // Standard high-detail flow for TS-SHP-2026-0891 (Mundra -> Rotterdam)
    if (activeShipment.id === 'TS-SHP-2026-0891') {
      const generatedNodes: Node[] = [
        {
          id: 'origin',
          type: 'waypoint',
          position: { x: 50, y: 160 },
          data: {
            title: 'Mundra Port (INMUN)',
            locationCode: 'ORIGIN',
            type: 'origin',
            status: 'completed',
            riskLevel: 'Low',
            dateLabel: 'Dep: Oct 18, 2026',
            description: 'Vessel laden & pilot outbound cleared from Berth 4.',
          } as WaypointNodeData,
        },
        {
          id: 'hub-1',
          type: 'waypoint',
          position: { x: 380, y: 160 },
          data: {
            title: 'Arabian Sea / Cape Route Entry',
            locationCode: 'TRANSIT HUB 1',
            type: 'hub',
            status: 'completed',
            riskLevel: 'Moderate',
            dateLabel: 'Passed: Oct 24',
            description: 'Rerouted south of Red Sea avoiding Bab-el-Mandeb risk zone.',
          } as WaypointNodeData,
        },
        {
          id: 'hub-2',
          type: 'waypoint',
          position: { x: 720, y: 160 },
          data: {
            title: 'Cape of Good Hope / South Atlantic',
            locationCode: 'TRANSIT HUB 2',
            type: 'hub',
            status: 'in-progress',
            riskLevel: 'Elevated',
            dateLabel: 'Waypoint: Oct 30 (Today)',
            description: 'Rounding Cape coast. Detour added +9.4 sailing days.',
          } as WaypointNodeData,
        },
        {
          id: 'weather-alert-1',
          type: 'weatherAlert',
          position: { x: 720, y: 360 },
          data: {
            corridor: 'English Channel & Biscay',
            phenomenon: 'North Atlantic Gale Front',
            waveHeightMeters: 4.8,
            windSpeedKnots: 45,
            rerouteImpact: 'Slow steaming advisory Nov 10-12',
            severity: 'high',
          } as WeatherAlertNodeData,
        },
        {
          id: 'hub-3',
          type: 'waypoint',
          position: { x: 1060, y: 160 },
          data: {
            title: 'Bay of Biscay & Channel Approach',
            locationCode: 'TRANSIT HUB 3',
            type: 'hub',
            status: 'pending',
            riskLevel: 'Elevated',
            dateLabel: 'Est: Nov 10, 2026',
            description: 'Pilot rendezvous window subject to storm holding pattern.',
          } as WaypointNodeData,
        },
        {
          id: 'destination',
          type: 'waypoint',
          position: { x: 1400, y: 160 },
          data: {
            title: 'Port of Rotterdam (NLRTM)',
            locationCode: 'DESTINATION',
            type: 'destination',
            status: 'pending',
            riskLevel: 'Elevated',
            dateLabel: 'ETA: Nov 14, 2026',
            description: 'Rotterdam Maasvlakte 2 container terminal discharge.',
          } as WaypointNodeData,
        },
        {
          id: 'port-congestion-1',
          type: 'portCongestion',
          position: { x: 1400, y: 360 },
          data: {
            portName: 'Port of Rotterdam (NLRTM)',
            terminal: 'Maasvlakte Delta Terminal',
            dwellTimeDays: 4.8,
            baselineDiffDays: 1.9,
            costImpactEstimate: '₹1.18 Lakh Demurrage Buffer',
            severity: 'elevated',
          } as PortCongestionNodeData,
        },
      ];

      const generatedEdges: Edge[] = [
        {
          id: 'e-origin-hub1',
          source: 'origin',
          target: 'hub-1',
          animated: false,
          style: { stroke: '#10b981', strokeWidth: 3 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
        },
        {
          id: 'e-hub1-hub2',
          source: 'hub-1',
          target: 'hub-2',
          animated: true,
          style: { stroke: '#38bdf8', strokeWidth: 3 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
        },
        {
          id: 'e-hub2-hub3',
          source: 'hub-2',
          target: 'hub-3',
          animated: true,
          style: { stroke: '#f59e0b', strokeWidth: 2.5, strokeDasharray: '4 4' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
        },
        {
          id: 'e-hub3-destination',
          source: 'hub-3',
          target: 'destination',
          animated: false,
          style: { stroke: '#f43f5e', strokeWidth: 2.5, strokeDasharray: '4 4' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#f43f5e' },
        },
        // Link to Weather alert
        {
          id: 'e-hub2-weather',
          source: 'hub-2',
          target: 'weather-alert-1',
          animated: true,
          style: { stroke: '#818cf8', strokeWidth: 2, strokeDasharray: '3 3' },
        },
        // Link to Port congestion
        {
          id: 'e-dest-congestion',
          source: 'destination',
          target: 'port-congestion-1',
          animated: true,
          style: { stroke: '#fb7185', strokeWidth: 2, strokeDasharray: '3 3' },
        },
      ];

      return { nodes: generatedNodes, edges: generatedEdges };
    }

    // Dynamic fallback graph for other shipments
    const steps = activeShipment.milestones || [];
    const generatedNodes: Node[] = steps.map((m, idx) => ({
      id: `step-${idx}`,
      type: 'waypoint',
      position: { x: 60 + idx * 340, y: 160 },
      data: {
        title: m.event,
        locationCode: idx === 0 ? 'ORIGIN' : idx === steps.length - 1 ? 'DESTINATION' : `HUB ${idx}`,
        type: idx === 0 ? 'origin' : idx === steps.length - 1 ? 'destination' : 'hub',
        status: m.status,
        riskLevel: activeShipment.riskLevel,
        dateLabel: m.date,
        description: `Shipment ${activeShipment.carrier} - ${activeShipment.voyage}`,
      } as WaypointNodeData,
    }));

    // Add port congestion or weather alert if risk factors present
    if (activeShipment.riskFactors?.portCongestion) {
      generatedNodes.push({
        id: 'congestion-node',
        type: 'portCongestion',
        position: { x: 60 + (steps.length - 1) * 340, y: 350 },
        data: {
          portName: activeShipment.destination,
          terminal: 'Main Container Terminal',
          dwellTimeDays: 3.5,
          baselineDiffDays: 1.2,
          costImpactEstimate: activeShipment.costExposureEstimate || '₹0',
          severity: activeShipment.riskLevel === 'Critical' ? 'critical' : 'elevated',
        } as PortCongestionNodeData,
      });
    }

    const generatedEdges: Edge[] = [];
    for (let i = 0; i < steps.length - 1; i++) {
      generatedEdges.push({
        id: `edge-${i}`,
        source: `step-${i}`,
        target: `step-${i + 1}`,
        animated: steps[i].status === 'in-progress',
        style: { stroke: '#38bdf8', strokeWidth: 3 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
      });
    }

    if (activeShipment.riskFactors?.portCongestion && steps.length > 0) {
      generatedEdges.push({
        id: 'edge-congestion',
        source: `step-${steps.length - 1}`,
        target: 'congestion-node',
        animated: true,
        style: { stroke: '#f43f5e', strokeWidth: 2, strokeDasharray: '3 3' },
      });
    }

    return { nodes: generatedNodes, edges: generatedEdges };
  }, [activeShipment]);

  return (
    <div className="bg-navy-deep/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
      {/* Shipment Selector Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Active Shipment Journey & Risk Topology
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  activeShipment?.riskLevel === 'Low' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                  activeShipment?.riskLevel === 'Moderate' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                  'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}>
                  {activeShipment?.riskLevel} Risk ({activeShipment?.riskScore}/100)
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                React Flow interactive graph linking origin port, maritime transit hubs, and destination with live sentinel alert nodes
              </p>
            </div>
          </div>
        </div>

        {/* Shipment Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Select Shipment:</span>
          <select
            value={selectedShipmentId}
            onChange={(e) => setSelectedShipmentId(e.target.value)}
            className="bg-navy-midnight border border-slate-700 text-xs rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {shipments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.reference} ({s.origin.split(',')[0]} → {s.destination.split(',')[0]}) - {s.riskLevel}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Shipment metadata strip */}
      {activeShipment && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 p-3 bg-navy-midnight/80 rounded-xl border border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Carrier & Voyage</span>
            <span className="font-semibold text-slate-200">{activeShipment.carrier}</span>
            <span className="text-slate-500 text-[11px] block">{activeShipment.voyage}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Cargo & Value</span>
            <span className="font-semibold text-slate-200">{activeShipment.cargo}</span>
            <span className="text-cyan-400 font-mono text-[11px] block">
              ${activeShipment.associatedInvoiceUSD.toLocaleString()} USD
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Transit Timeline</span>
            <span className="font-semibold text-slate-200">
              {activeShipment.departureDate} → {activeShipment.estimatedArrival}
            </span>
            <span className="text-amber-400 text-[11px] block">{activeShipment.status}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Financial Exposure</span>
            <span className="font-semibold text-rose-300 font-mono">
              {activeShipment.costExposureEstimate}
            </span>
            <span className="text-emerald-400 text-[10px] block font-mono">
              {activeShipment.insuranceStatus}
            </span>
          </div>
        </div>
      )}

      {/* CRITICAL SETUP NOTE REQUIREMENT:
          "React Flow needs a parent container with an explicit height, or it renders blank. This trips up most people the first time."
          Here we specify explicit height: h-[560px] w-full min-h-[500px]
      */}
      <div 
        className="w-full h-[540px] min-h-[500px] rounded-xl border border-slate-800/80 bg-navy-midnight/90 overflow-hidden relative"
        style={{ height: '540px', minHeight: '500px' }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={1.5}
          attributionPosition="bottom-right"
        >
          <Background color="#1e293b" gap={20} size={1.5} />
          <Controls className="!bg-navy-surface !border-slate-700 !fill-slate-300" />
          <MiniMap
            nodeStrokeColor="#38bdf8"
            nodeColor="#1e314b"
            maskColor="rgba(16, 27, 45, 0.8)"
            className="!bg-navy-deep !border !border-slate-800 rounded-lg"
          />
        </ReactFlow>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-800/60">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          Drag canvas or zoom to inspect transit waypoints, port dwell thresholds, and weather reroute advisories.
        </span>
        <span className="font-mono text-slate-500">
          Powered by @xyflow/react v12
        </span>
      </div>
    </div>
  );
}

