import type { ActorRole } from "@/lib/types";

// Inline hex (not Tailwind classes) so colors survive purging and can be used
// for SVG/absolute-positioned arrows.
export const ROLE_COLORS: Record<ActorRole, string> = {
  user: "#34d399",
  browser: "#60a5fa",
  client: "#a78bfa",
  authServer: "#f59e0b",
  resourceServer: "#f472b6",
  system: "#94a3b8",
};
