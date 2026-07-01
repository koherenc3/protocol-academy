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
    <div className="rounded-lg border border-slate-700/60 border-l-2 border-l-emerald-500/50 bg-slate-900/40 p-4 font-mono">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span className="rounded bg-slate-800 px-1.5 py-0.5 font-bold text-emerald-400">
          [{String(index + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}]
        </span>
        <span className="flex items-center gap-1">
          <ActorChip actor={from} />
          <span aria-hidden className="text-slate-600">
            {"->"}
          </span>
          <ActorChip actor={to} />
        </span>
      </div>

      <h3 className="mt-2 text-base font-semibold text-slate-100">
        <span className="text-emerald-500" aria-hidden>
          ${" "}
        </span>
        {step.label}
      </h3>
      <p className="mt-1 font-sans text-sm leading-relaxed text-slate-300">
        {step.description}
      </p>

      {step.payload && (
        <div className="mt-4">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {"// payload"}
          </div>
          <PayloadViewer payload={step.payload} />
        </div>
      )}
    </div>
  );
}

function ActorChip({ actor }: { actor?: Actor }) {
  if (!actor) return <span className="text-slate-500">?</span>;
  return (
    <span style={{ color: ROLE_COLORS[actor.role] }} className="font-medium">
      {actor.label}
    </span>
  );
}
