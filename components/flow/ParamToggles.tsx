import type { ParamToggle } from "@/lib/types";

interface Props {
  params: ParamToggle[];
  state: Record<string, boolean>;
  onToggle: (id: string, value: boolean) => void;
}

/** Toggle controls that add/remove conditional steps (e.g. PKCE on/off). */
export function ParamToggles({ params, state, onToggle }: Props) {
  if (params.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-3 font-mono text-sm">
      {params.map((p) => {
        const on = state[p.id];
        return (
          <label
            key={p.id}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-term-border bg-term-panel/40 px-3 py-1.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-term-green/60"
            title={p.description}
          >
            <input
              type="checkbox"
              checked={on}
              onChange={(e) => onToggle(p.id, e.target.checked)}
              className="sr-only"
            />
            <span
              aria-hidden
              className={on ? "text-term-green" : "text-term-dim"}
            >
              [{on ? "x" : " "}]
            </span>
            <span className={on ? "text-term-fg" : "text-term-dim"}>
              {p.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
