import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ActorRole } from "@/lib/types";
import { ROLE_COLORS } from "../roleColors";
import { RoleIcon } from "../RoleIcon";

export interface ActorNodeData {
  label: string;
  role: ActorRole;
  description?: string;
  active?: boolean; // is this actor an endpoint of the active step?
  [key: string]: unknown;
}

/**
 * A node representing one actor in the topology view. Colored by role, with
 * hidden center handles so floating edges can attach. Lights up when it's an
 * endpoint of the active step.
 */
export function ActorNode({ data }: NodeProps & { data: ActorNodeData }) {
  const color = ROLE_COLORS[data.role];
  return (
    <div
      className="flex items-center gap-2 rounded-lg border-2 bg-slate-900 px-3 py-2 text-xs font-semibold transition-shadow"
      style={{
        borderColor: color,
        color,
        boxShadow: data.active ? `0 0 0 2px ${color}, 0 0 14px ${color}` : undefined,
      }}
      title={data.description}
    >
      <RoleIcon role={data.role} />
      <span className="whitespace-nowrap text-slate-100">{data.label}</span>

      {/* Hidden handles: floating edges compute their own attach points. */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={false}
        style={{ opacity: 0, left: "50%", top: "50%" }}
      />
      <Handle
        type="source"
        position={Position.Top}
        isConnectable={false}
        style={{ opacity: 0, left: "50%", top: "50%" }}
      />
    </div>
  );
}
