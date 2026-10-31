'use client';

import React, { useMemo, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react';
import QuietRouteNode, { QuietRouteNodeData } from './nodes/QuietRouteNode';
import { Shipment } from '../../types';

interface Props {
  shipment: Shipment;
  onSelectShipment?: (s: Shipment) => void;
}

export default function OverviewShipmentJourney({ shipment }: Props) {
  // Soft 3D tilt tracking
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 6; // Max 3deg tilt
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -6;
    setTilt({ x, y });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const nodeTypes = useMemo(() => ({
    quietRoute: QuietRouteNode,
  }), []);

  // Generate clean route nodes
  const { nodes, edges } = useMemo(() => {
    const generatedNodes: Node[] = [
      {
        id: 'node-origin',
        type: 'quietRoute',
        position: { x: 40, y: 70 },
        data: {
          label: 'Mundra Port',
          sublabel: 'Departed Oct 18',
          status: 'completed',
          isFirst: true,
        } as QuietRouteNodeData,
      },
      {
        id: 'node-hub1',
        type: 'quietRoute',
        position: { x: 230, y: 70 },
        data: {
          label: 'Arabian Sea',
          sublabel: 'Passed Oct 24',
          status: 'completed',
        } as QuietRouteNodeData,
      },
      {
        id: 'node-hub2',
        type: 'quietRoute',
        position: { x: 440, y: 70 },
        data: {
          label: 'Cape Route (MSK-2641W)',
          sublabel: 'Active position · Today',
          status: 'in-progress',
          isVessel: true,
          annotation: '+9.4d detour around Red Sea',
        } as QuietRouteNodeData,
      },
      {
        id: 'node-hub3',
        type: 'quietRoute',
        position: { x: 690, y: 70 },
        data: {
          label: 'Bay of Biscay',
          sublabel: 'Estimated Nov 10',
          status: 'pending',
        } as QuietRouteNodeData,
      },
      {
        id: 'node-dest',
        type: 'quietRoute',
        position: { x: 910, y: 70 },
        data: {
          label: 'Port of Rotterdam',
          sublabel: 'ETA Nov 14',
          status: 'pending',
          annotation: '4.8d dwell (+1.9d)',
          isLast: true,
        } as QuietRouteNodeData,
      },
    ];

    const generatedEdges: Edge[] = [
      {
        id: 'e-1-2',
        source: 'node-origin',
        target: 'node-hub1',
        style: { stroke: '#9E9A90', strokeWidth: 1.5 },
      },
      {
        id: 'e-2-3',
        source: 'node-hub1',
        target: 'node-hub2',
        style: { stroke: '#9E9A90', strokeWidth: 1.5 },
      },
      {
        id: 'e-3-4',
        source: 'node-hub2',
        target: 'node-hub3',
        style: { stroke: '#6E6A62', strokeWidth: 1.5, strokeDasharray: '4 4' },
      },
      {
        id: 'e-4-5',
        source: 'node-hub3',
        target: 'node-dest',
        style: { stroke: '#6E6A62', strokeWidth: 1.5, strokeDasharray: '4 4' },
      },
    ];

    return { nodes: generatedNodes, edges: generatedEdges };
  }, [shipment]);

  return (
    <div
      style={{ perspective: '1000px' }}
      className="w-full"
    >
      <div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
          transition: 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        className="relative bg-surface/50 border border-hairline rounded-[20px] p-6 sm:p-8"
      >
        {/* Header line */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-6">
          <div>
            <div className="text-xs uppercase tracking-wide text-text-muted font-sans font-medium">
              Active Maritime Transit
            </div>
            <h3 className="font-serif text-2xl text-text mt-1">
              Mundra to Rotterdam
            </h3>
          </div>
          <div className="text-xs text-text-muted font-sans">
            Maersk Line · Voyage MSK-2641W · <span className="text-accent">2 vessels facing dwell delay</span>
          </div>
        </div>

        {/* Narrative context */}
        <p className="text-sm text-text-muted leading-relaxed max-w-2xl mb-6">
          Vessel is rounding the Cape of Good Hope to avoid Red Sea risk. Detour adds 9.4 sailing days; Maasvlakte terminal dwell currently elevated to 4.8 days.
        </p>

        {/* React Flow canvas */}
        <div
          className="w-full h-[220px] relative overflow-hidden"
          style={{ height: '220px' }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            zoomOnScroll={false}
            panOnDrag={true}
            preventScrolling={false}
          />
        </div>

        {/* Quiet footer metadata */}
        <div className="flex flex-wrap items-center justify-between text-xs text-text-faint pt-4 border-t border-hairline mt-2">
          <span>Cargo: Precision CNC Aluminum Flanges (24 MT)</span>
          <span>Coverage: ICC-A Marine All-Risk</span>
        </div>
      </div>
    </div>
  );
}

