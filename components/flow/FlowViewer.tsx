"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Flow } from "@/lib/types";
import { SequenceDiagram } from "./SequenceDiagram";
import { StepInspector } from "./StepInspector";
import { ParamToggles } from "./ParamToggles";

type ViewMode = "sequence" | "topology";

// Code-split React Flow: its chunk only loads when the user opens Topology,
// keeping the default Sequence view lightweight.
const TopologyDiagram = dynamic(
  () => import("./topology/TopologyDiagram").then((m) => m.TopologyDiagram),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[440px] place-items-center font-mono text-sm text-term-dim">
        <span className="animate-pulse">$ loading topology…</span>
      </div>
    ),
  },
);

/**
 * Interactive orchestrator for a single flow. Owns param-toggle state, derives
 * the visible step set, tracks the active step, and wires up keyboard
 * navigation. The whole thing is driven by the `Flow` data object — no
 * per-protocol code.
 */
export function FlowViewer({ flow }: { flow: Flow }) {
  const params = useMemo(() => flow.params ?? [], [flow.params]);

  const [paramState, setParamState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(params.map((p) => [p.id, p.defaultOn ?? true])),
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [view, setView] = useState<ViewMode>("sequence");
  const [isPlaying, setIsPlaying] = useState(false);

  // Steps visible under the current param toggles.
  const visibleSteps = useMemo(
    () =>
      flow.steps.filter((step) => {
        const requiresOk = (step.requires ?? []).every((id) => paramState[id]);
        const excludesOk = (step.excludes ?? []).every((id) => !paramState[id]);
        return requiresOk && excludesOk;
      }),
    [flow.steps, paramState],
  );

  // Keep the active index in range when the visible set shrinks.
  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(0, visibleSteps.length - 1)));
  }, [visibleSteps.length]);

  // Manual navigation; also halts auto-play.
  const go = useCallback(
    (delta: number) => {
      setIsPlaying(false);
      setActiveIndex((i) =>
        Math.max(0, Math.min(visibleSteps.length - 1, i + delta)),
      );
    },
    [visibleSteps.length],
  );

  // Selecting a step (click in a diagram) also halts auto-play.
  const select = useCallback((i: number) => {
    setIsPlaying(false);
    setActiveIndex(i);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((p) => {
      if (!p && activeIndex >= visibleSteps.length - 1) setActiveIndex(0);
      return !p;
    });
  }, [activeIndex, visibleSteps.length]);

  // Auto-advance while playing; stop at the last step.
  useEffect(() => {
    if (!isPlaying) return;
    if (activeIndex >= visibleSteps.length - 1) {
      setIsPlaying(false);
      return;
    }
    const t = setTimeout(() => setActiveIndex((i) => i + 1), 1600);
    return () => clearTimeout(t);
  }, [isPlaying, activeIndex, visibleSteps.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const onToggle = (id: string, value: boolean) =>
    setParamState((s) => ({ ...s, [id]: value }));

  const activeStep = visibleSteps[activeIndex];

  // Topology is opt-in per flow (flow.topology). When off, only Sequence shows.
  const hasTopology = flow.topology === true;
  const showTopology = hasTopology && view === "topology";

  return (
    <div className="space-y-4">
      {(hasTopology || params.length > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* View toggle: Sequence ("when") ⇄ Topology ("where") */}
          {hasTopology ? (
            <div className="inline-flex rounded-md border border-term-border p-0.5 font-mono text-sm">
              {(["sequence", "topology"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  aria-pressed={view === mode}
                  className={`rounded px-3 py-1 font-medium transition-colors ${
                    view === mode
                      ? "bg-term-green text-term-bg"
                      : "text-term-fg hover:bg-term-border/40"
                  }`}
                >
                  {mode === "sequence" ? "--sequence" : "--topology"}
                </button>
              ))}
            </div>
          ) : (
            <span />
          )}
          {params.length > 0 && (
            <ParamToggles params={params} state={paramState} onToggle={onToggle} />
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-term-border bg-term-panel/40">
        <div className="flex items-center gap-2 border-b border-term-border bg-term-panel/80 px-3 py-1.5">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-term-red/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-term-amber/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-term-green/60" />
          </span>
          <span className="truncate font-mono text-[11px] text-term-dim">
            {flow.protocolId}/{flow.id} — {showTopology ? "topology" : "sequence"}.diagram
          </span>
        </div>
        <div className="p-4">
          {showTopology ? (
            <TopologyDiagram
              actors={flow.actors}
              steps={visibleSteps}
              activeIndex={activeIndex}
              onSelect={select}
            />
          ) : (
            <SequenceDiagram
              actors={flow.actors}
              steps={visibleSteps}
              activeIndex={activeIndex}
              onSelect={select}
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 font-mono text-sm">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={activeIndex === 0}
          className="rounded-md border border-term-border px-3 py-1.5 font-medium text-term-fg enabled:hover:border-term-green/60 enabled:hover:bg-term-border/40 disabled:opacity-40"
        >
          [ ← prev ]
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className="rounded-md border border-term-green/50 px-3 py-1.5 font-medium text-term-green hover:bg-term-green/10"
          >
            {isPlaying ? "[ ⏸ pause ]" : "[ ▶ run ]"}
          </button>
          <span className="hidden text-xs text-term-dim sm:inline">
            ← / → or click a message
          </span>
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={activeIndex >= visibleSteps.length - 1}
          className="rounded-md border border-term-border px-3 py-1.5 font-medium text-term-fg enabled:hover:border-term-green/60 enabled:hover:bg-term-border/40 disabled:opacity-40"
        >
          [ next → ]
        </button>
      </div>

      {activeStep && (
        <StepInspector
          step={activeStep}
          index={activeIndex}
          total={visibleSteps.length}
          actors={flow.actors}
        />
      )}
    </div>
  );
}
