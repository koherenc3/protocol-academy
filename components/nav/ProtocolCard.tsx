import Link from "next/link";
import type { Protocol } from "@/lib/types";

/** Landing-page card summarizing a protocol and linking to its flows. */
export function ProtocolCard({ protocol }: { protocol: Protocol }) {
  return (
    <Link
      href={`/${protocol.id}/`}
      className="term-panel term-bracket group block p-5 transition-colors hover:border-term-green/70 hover:shadow-glow"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-display text-xl tracking-wide text-term-fg group-hover:text-term-green">
          {protocol.name}
        </h3>
        {/* Card sits under its category header, so show the finer sub-type here
            (fall back to category if a protocol hasn't set one). */}
        <span className="shrink-0 border border-term-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-term-dim">
          {protocol.subtype ?? protocol.category}
        </span>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-term-fg/70">
        {protocol.summary}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {protocol.flows.map((f) => (
          <span
            key={f.id}
            className="border border-term-border px-2 py-0.5 text-xs text-term-cyan/90"
          >
            {f.title}
          </span>
        ))}
      </div>
    </Link>
  );
}
