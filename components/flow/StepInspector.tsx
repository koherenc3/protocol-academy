import type { Actor, FlowStep } from "@/lib/types";
import { ROLE_COLORS } from "./roleColors";
import { PayloadViewer } from "@/components/payload/PayloadViewer";

interface Props {
  step: FlowStep;
  index: number;
  total: number;
  actors: Actor[];
}

/** Detail panel for the active step: who→whom, the explanation, and payload. */
export function StepInspector({ step, index, total, actors }: Props) {
  const from = actors.find((a) => a.id === step.from);
  const to = actors.find((a) => a.id === step.to);

  return (
    <div className="rounded-lg border border-term-border border-l-2 border-l-term-green/50 bg-term-panel/40 p-4 font-mono">
      <div className="flex items-center gap-2 text-xs text-term-dim">
        <span className="rounded bg-term-panel px-1.5 py-0.5 font-bold text-term-green">
          [{String(index + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}]
        </span>
        <span className="flex items-center gap-1">
          <ActorChip actor={from} />
          <span aria-hidden className="text-term-dim">
            {"->"}
          </span>
          <ActorChip actor={to} />
        </span>
      </div>

      <h3 className="mt-2 text-base font-semibold text-term-fg">
        <span className="text-term-green" aria-hidden>
          ${" "}
        </span>
        {step.label}
      </h3>
      <p className="mt-1 font-sans text-sm leading-relaxed text-term-fg/80">
        {step.description}
      </p>

      {step.payload && (
        <div className="mt-4">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-term-dim">
            {"// payload"}
          </div>
          <PayloadViewer payload={step.payload} />
        </div>
      )}
    </div>
  );
}

function ActorChip({ actor }: { actor?: Actor }) {
  if (!actor) return <span className="text-term-dim">?</span>;
  return (
    <span style={{ color: ROLE_COLORS[actor.role] }} className="font-medium">
      {actor.label}
    </span>
  );
}
