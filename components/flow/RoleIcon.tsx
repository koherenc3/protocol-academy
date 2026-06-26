import type { ActorRole } from "@/lib/types";

/**
 * Minimal line glyphs per actor role, drawn with currentColor so the caller
 * controls the hue (we tint them with the role color).
 */
export function RoleIcon({
  role,
  className,
}: {
  role: ActorRole;
  className?: string;
}) {
  const common = {
    className,
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (role) {
    case "user":
      return (
        <svg {...common} aria-hidden>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );
    case "browser":
      return (
        <svg {...common} aria-hidden>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18" />
          <circle cx="6.5" cy="6.5" r="0.6" fill="currentColor" />
          <circle cx="9" cy="6.5" r="0.6" fill="currentColor" />
        </svg>
      );
    case "client":
      return (
        <svg {...common} aria-hidden>
          <rect x="6" y="3" width="12" height="18" rx="2" />
          <path d="M10.5 18h3" />
        </svg>
      );
    case "authServer":
      return (
        <svg {...common} aria-hidden>
          <circle cx="8" cy="8" r="4" />
          <path d="M11 11l7 7M16 16l2-2M14 18l2-2" />
        </svg>
      );
    case "resourceServer":
      return (
        <svg {...common} aria-hidden>
          <ellipse cx="12" cy="5" rx="7" ry="3" />
          <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
          <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
        </svg>
      );
    case "system":
    default:
      return (
        <svg {...common} aria-hidden>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
        </svg>
      );
  }
}
