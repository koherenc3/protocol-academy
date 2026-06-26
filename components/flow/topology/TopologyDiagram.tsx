"use client";

import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  type Node,
  type Edge,
} from "@xyflow/react";
import type { Actor, ActorRole, FlowStep } from "@/lib/types";
import { channelOf, CHANNEL_COLORS } from "../channels";
import { FloatingEdge } from "./FloatingEdge";
import { ActorNode, type ActorNodeData } from "./ActorNode";

interface Props {
  actors: Actor[];
  steps: FlowStep[]; // visible set
  activeIndex: number;
  onSelect: (index: number) => void;
}

const nodeTypes = { actor: ActorNode };
const edgeTypes = { floating: FloatingEdge };

const NODE_W = 168;
const NODE_H = 44;
const COL_GAP = 250;
const ROW_GAP = 96;

// Left-to-right ordering by role: User → Browser → Client → (System) →
// Authorization Server → Resource Server. Reads as a technical process flow.
const LAYER_RANK: Record<ActorRole, number> = {
  user: 0,
  browser: 1,
  client: 2,
  system: 3,
  authServer: 4,
  resourceServer: 5,
};

/** Position actors in compacted left-to-right columns by role; stack ties. */
function layoutPositions(actors: Actor[]): Record<string, { x: number; y: number }> {
  const byRank = new Map<number, Actor[]>();
  for (const a of actors) {
    const rank = LAYER_RANK[a.role];
    const group = byRank.get(rank) ?? [];
    group.push(a);
    byRank.set(rank, group);
  }
  const ranks = [...byRank.keys()].sort((x, y) => x - y); // skip empty layers
  const pos: Record<string, { x: number; y: number }> = {};
  ranks.forEach((rank, col) => {
    const group = byRank.get(rank)!;
    group.forEach((a, i) => {
      pos[a.id] = {
        x: col * COL_GAP,
        y: (i - (group.length - 1) / 2) * ROW_GAP,
      };
    });
  });
  return pos;
}

/**
 * Topology ("where") view: actors as nodes in 2D space with floating edges
 * between any pair that exchanges a message. The active step is drawn as a
 * bright, animated, directional edge; its endpoints light up. Clicking an edge
 * selects the corresponding step. Driven entirely by the Flow data, so every
 * flow gets this view for free.
 */
export function TopologyDiagram({ actors, steps, activeIndex, onSelect }: Props) {
  const activeStep = steps[activeIndex];

  const nodes: Node[] = useMemo(() => {
    const pos = layoutPositions(actors);
    return actors.map((a) => {
      const isActive =
        !!activeStep && (activeStep.from === a.id || activeStep.to === a.id);
      const data: ActorNodeData = {
        label: a.label,
        role: a.role,
        description: a.description,
        active: isActive,
      };
      return {
        id: a.id,
        type: "actor",
        position: {
          x: pos[a.id].x - NODE_W / 2,
          y: pos[a.id].y - NODE_H / 2,
        },
        data,
        draggable: false,
        connectable: false,
      };
    });
  }, [actors, activeStep]);

  const edges: Edge[] = useMemo(() => {
    const result: Edge[] = [];
    const seen = new Map<string, number>(); // "from->to" -> first step index

    steps.forEach((s, i) => {
      if (s.from === s.to) return;
      const key = `${s.from}->${s.to}`;
      if (!seen.has(key)) seen.set(key, i);
    });

    // Faint baseline edges showing the overall topology.
    for (const [key, firstIndex] of seen) {
      const [from, to] = key.split("->");
      const color = CHANNEL_COLORS[channelOf(steps[firstIndex], actors)];
      result.push({
        id: `base-${key}`,
        source: from,
        target: to,
        type: "floating",
        data: { stepIndex: firstIndex },
        style: { stroke: color, strokeWidth: 1.5, opacity: 0.3 },
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
      });
    }

    // The active step on top: bright, animated, directional.
    if (activeStep && activeStep.from !== activeStep.to) {
      const color = CHANNEL_COLORS[channelOf(activeStep, actors)];
      result.push({
        id: `active-${activeIndex}`,
        source: activeStep.from,
        target: activeStep.to,
        type: "floating",
        animated: true,
        data: { stepIndex: activeIndex },
        label: activeStep.label,
        style: { stroke: color, strokeWidth: 3 },
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 20, height: 20 },
      });
    }

    return result;
  }, [steps, actors, activeStep, activeIndex]);

  return (
    <div className="h-[440px] w-full overflow-hidden rounded-lg border border-slate-700/60 bg-slate-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: false }}
        onEdgeClick={(_e, edge) => {
          const idx = (edge.data as { stepIndex?: number } | undefined)?.stepIndex;
          if (typeof idx === "number") onSelect(idx);
        }}
        onNodeClick={(_e, node) => {
          // Select the first visible step that touches this actor.
          const idx = steps.findIndex(
            (s) => s.from === node.id || s.to === node.id,
          );
          if (idx >= 0) onSelect(idx);
        }}
      >
        <Background color="#1e293b" gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
