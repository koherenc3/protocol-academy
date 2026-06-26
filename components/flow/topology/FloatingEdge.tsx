import {
  BaseEdge,
  EdgeLabelRenderer,
  useInternalNode,
  type EdgeProps,
} from "@xyflow/react";
import { getEdgeParams } from "./floating";

/**
 * An edge that attaches to node borders (not handles) and arcs off the lane so
 * it routes *around* any nodes between its endpoints rather than drawing
 * straight through them — important in the left-to-right layout where actors
 * are collinear. Forward messages bow downward, responses bow upward, so a
 * request and its reply never overlap. Marching-ants animation comes from
 * React Flow's `animated` flag.
 */
export function FloatingEdge({
  id,
  source,
  target,
  markerEnd,
  style,
  label,
}: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) return null;
  if (!sourceNode.measured.width || !targetNode.measured.width) return null;

  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode);

  // Bow proportional to horizontal span (so longer hops clear taller gaps);
  // sign by direction so forward/response don't sit on top of each other.
  const dx = tx - sx;
  const magnitude = Math.min(130, Math.max(40, Math.abs(dx) * 0.24));
  const bow = dx >= 0 ? magnitude : -magnitude;

  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2 + bow;
  const path = `M ${sx},${sy} Q ${mx},${my} ${tx},${ty}`;

  // Quadratic-bezier midpoint (t = 0.5) for label placement.
  const labelX = 0.25 * sx + 0.5 * mx + 0.25 * tx;
  const labelY = 0.25 * sy + 0.5 * my + 0.25 * ty;

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] font-semibold text-amber-300 shadow"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
