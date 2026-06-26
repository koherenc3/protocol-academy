import Link from "next/link";
import type { Protocol } from "@/lib/types";

/** Landing-page card summarizing a protocol and linking to its flows. */
export function ProtocolCard({ protocol }: { protocol: Protocol }) {
  return (
    <Link
      href={`/${protocol.id}/`}
      className="group block rounded-xl border border-slate-700/60 bg-slate-900/40 p-5 transition-colors hover:border-amber-400/60 hover:bg-slate-900/70"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-100 group-hover:text-amber-200">
          {protocol.name}
        </h3>
        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
          {protocol.category}
        </span>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
        {protocol.summary}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {protocol.flows.map((f) => (
          <span
            key={f.id}
            className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-300"
          >
            {f.title}
          </span>
        ))}
      </div>
    </Link>
  );
}
