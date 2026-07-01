"use client";

import { motion } from "framer-motion";
import type { Actor, FlowStep } from "@/lib/types";
import { ROLE_COLORS } from "./roleColors";
import { RoleIcon } from "./RoleIcon";
import { channelOf, CHANNEL_COLORS, CHANNEL_LABELS, type Channel } from "./channels";

interface Props {
  actors: Actor[];
  steps: FlowStep[]; // already filtered to the visible set
  activeIndex: number;
  onSelect: (index: number) => void;
}

const ACTIVE = "#fbbf24"; // amber emphasis for the selected step

/**
 * Animated sequence diagram. Vertical lifelines per actor; one arrowed message
 * per step, colored by transport channel (front vs back). The active step is
 * emphasized and a token animates along its path from sender to receiver.
 */
export function SequenceDiagram({ actors, steps, activeIndex, onSelect }: Props) {
  const n = actors.length;
  const centerOf = (actorId: string) => {
    const idx = actors.findIndex((a) => a.id === actorId);
    return ((idx + 0.5) / n) * 100;
  };

  const usedChannels = Array.from(
    new Set(steps.map((s) => channelOf(s, actors))),
  ).filter((c) => c !== "internal") as Channel[];

  return (
    <div className="overflow-x-auto font-mono">
      <div className="min-w-[600px]">
        {/* Actor headers */}
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        >
          {actors.map((a) => (
            <div key={a.id} className="text-center">
              <div
                className="mx-auto inline-flex items-center gap-1.5 rounded-md border bg-slate-950/60 px-2.5 py-1.5 text-xs font-semibold"
                style={{ borderColor: ROLE_COLORS[a.role], color: ROLE_COLORS[a.role] }}
                title={a.description}
              >
                <RoleIcon role={a.role} />
                <span>{a.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Message rows with lifelines behind */}
        <div className="relative mt-2">
          <div className="pointer-events-none absolute inset-0">
            {actors.map((a) => (
              <div
                key={a.id}
                className="absolute top-0 bottom-0 w-px bg-slate-700/60"
                style={{ left: `${centerOf(a.id)}%` }}
              />
            ))}
          </div>

          <ol className="relative">
            {steps.map((step, i) => (
              <MessageRow
                key={step.id}
                step={step}
                index={i}
                active={i === activeIndex}
                channel={channelOf(step, actors)}
                fromCenter={centerOf(step.from)}
                toCenter={centerOf(step.to)}
                onSelect={onSelect}
              />
            ))}
          </ol>
        </div>

        {/* Channel legend */}
        {usedChannels.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-4 border-t border-slate-800 pt-2 text-[11px] text-slate-500">
            {usedChannels.map((c) => (
              <span key={c} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-4 rounded-sm"
                  style={{ backgroundColor: CHANNEL_COLORS[c] }}
                />
                {CHANNEL_LABELS[c]}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MessageRow({
  step,
  index,
  active,
  channel,
  fromCenter,
  toCenter,
  onSelect,
}: {
  step: FlowStep;
  index: number;
  active: boolean;
  channel: Channel;
  fromCenter: number;
  toCenter: number;
  onSelect: (i: number) => void;
}) {
  const left = Math.min(fromCenter, toCenter);
  const width = Math.abs(toCenter - fromCenter);
  const pointsRight = toCenter >= fromCenter;
  const isSelf = width === 0;
  const lineColor = CHANNEL_COLORS[channel];

  const badge = (
    <span
      className={`absolute left-1 top-1/2 z-20 flex h-5 min-w-[1.25rem] -translate-y-1/2 items-center justify-center rounded-sm px-0.5 text-[10px] font-bold transition-colors ${
        active
          ? "bg-amber-400 text-slate-900"
          : "bg-slate-800 text-emerald-400 group-hover:bg-slate-700"
      }`}
    >
      {String(index + 1).padStart(2, "0")}
    </span>
  );

  if (isSelf) {
    return (
      <li>
        <button
          type="button"
          onClick={() => onSelect(index)}
          aria-current={active}
          className={`group relative block h-14 w-full text-left transition-colors ${
            active ? "bg-amber-400/5" : "hover:bg-slate-700/20"
          }`}
        >
          {badge}
          <motion.span
            className="absolute top-1/2 z-10 flex h-6 items-center rounded-sm border px-2 text-[11px]"
            style={{ left: `${left}%`, marginTop: -12, borderColor: lineColor, color: lineColor }}
            animate={active ? { scale: [1, 1.12, 1] } : { scale: 1 }}
            transition={active ? { duration: 1.1, repeat: Infinity } : { duration: 0.2 }}
          >
            ↻ local()
          </motion.span>
          <span
            className={`absolute top-1/2 z-10 -translate-y-1/2 pl-2 text-[11px] ${
              active ? "font-semibold text-amber-200" : "text-slate-300"
            }`}
            style={{ left: `calc(${left}% + 88px)` }}
          >
            {step.label}
          </span>
        </button>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(index)}
        aria-current={active}
        className={`group relative block h-14 w-full text-left transition-colors ${
          active ? "bg-amber-400/5" : "hover:bg-slate-700/20"
        }`}
      >
        {badge}

        {/* label above the line */}
        <span
          className={`absolute top-1.5 z-10 -translate-x-1/2 px-1 text-center text-[11px] leading-tight ${
            active ? "font-semibold text-amber-200" : "text-slate-300"
          }`}
          style={{ left: `${left + width / 2}%`, maxWidth: `${Math.max(width, 20)}%` }}
        >
          {step.label}
        </span>

        {/* the arrow line (dashed for responses); colored by channel, glows when active */}
        <span
          className="absolute top-1/2"
          style={{
            left: `${left}%`,
            width: `${width}%`,
            height: 0,
            borderTop:
              step.direction === "back"
                ? `2px dashed ${lineColor}`
                : `${active ? 3 : 2}px solid ${lineColor}`,
            filter: active ? `drop-shadow(0 0 4px ${ACTIVE})` : undefined,
            opacity: active ? 1 : 0.7,
          }}
        />
        {/* arrowhead at the destination end */}
        <span
          className="absolute top-1/2 -translate-y-1/2"
          style={{
            left: pointsRight ? `calc(${left + width}% - 7px)` : `${left}%`,
            width: 0,
            height: 0,
            borderTop: "5px solid transparent",
            borderBottom: "5px solid transparent",
            [pointsRight ? "borderLeft" : "borderRight"]: `7px solid ${lineColor}`,
            opacity: active ? 1 : 0.7,
          }}
        />

        {/* traveling token — animates along the active message path */}
        {active && (
          <motion.span
            key={step.id}
            className="absolute top-1/2 z-20 flex h-5 w-5 items-center justify-center rounded-full text-[10px] shadow-lg"
            style={{
              marginTop: -10,
              marginLeft: -10,
              backgroundColor: ACTIVE,
              color: "#1e293b",
            }}
            initial={{ left: `${fromCenter}%`, opacity: 0, scale: 0.5 }}
            animate={{ left: `${toCenter}%`, opacity: 1, scale: 1 }}
            transition={{ duration: 0.85, ease: "easeInOut" }}
            aria-hidden
          >
            {step.payload ? "✉" : "•"}
          </motion.span>
        )}
      </button>
    </li>
  );
}
