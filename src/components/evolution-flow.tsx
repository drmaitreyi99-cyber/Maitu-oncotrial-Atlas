"use client";

import { Background, Controls, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { EvolutionPathway } from "@/lib/types";

export function EvolutionFlow({ pathway }: { pathway: EvolutionPathway }) {
  const nodes = pathway.nodes.map((node, index) => ({
    id: node.id,
    position: { x: (index % 3) * 280, y: Math.floor(index / 3) * 160 },
    data: { label: `${node.title}\n${node.detail}` },
    style: {
      width: 240,
      borderRadius: 16,
      border: "1px solid #ddd6fe",
      background: node.kind === "negative" || node.kind === "pending" ? "#fff7ed" : "#ffffff",
      fontSize: 12,
      whiteSpace: "pre-wrap" as const,
      padding: 8,
    },
  }));
  const edges = pathway.edges.map((edge, index) => ({
    id: `${edge.source}-${edge.target}-${index}`,
    source: edge.source,
    target: edge.target,
    label: edge.label,
  }));

  return (
    <div className="h-[460px] overflow-hidden rounded-2xl border border-line">
      <ReactFlow nodes={nodes} edges={edges} fitView nodesDraggable={false}>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
