import type { Actor, FlowStep } from "@/lib/types";

export type Channel = "front" | "direct" | "internal";

// Channel encodes transport trust. Kept visually distinct from the role lane
// colors (which only appear on actor headers).
export const CHANNEL_COLORS: Record<Channel, string> = {
  front: "#38bdf8", // sky — via the browser / front channel
  direct: "#818cf8", // indigo — back channel, server-to-server
  internal: "#64748b", // slate — local computation (self-message)
};

export const CHANNEL_LABELS: Record<Channel, string> = {
  front: "Front channel (via browser)",
  direct: "Back channel (server-to-server)",
  internal: "Internal (local)",
};

/**
 * Resolve a step's channel: explicit `channel` wins; otherwise infer. A
 * self-message is internal; a hop touching the browser or user is front
 * channel; everything else is a direct back-channel call.
 */
export function channelOf(step: FlowStep, actors: Actor[]): Channel {
  if (step.from === step.to) return "internal";
  if (step.channel) return step.channel;

  const roleOf = (id: string) => actors.find((a) => a.id === id)?.role;
  const endpoints = [roleOf(step.from), roleOf(step.to)];
  if (endpoints.includes("browser") || endpoints.includes("user")) return "front";
  return "direct";
}
