import { getProtocolsByCategory } from "@/content/registry";
import { ProtocolCard } from "@/components/nav/ProtocolCard";

export default function HomePage() {
  const groups = getProtocolsByCategory();

  return (
    <div>
      <section className="mb-10">
        <h1 className="text-3xl font-bold text-slate-100">
          Learn IAM &amp; security protocols by stepping through them
        </h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Each protocol is an interactive walkthrough: click through every message
          in the flow, inspect the real inputs and outputs, and decode the tokens
          and payloads exchanged at each step.
        </p>
      </section>

      {groups.map((group) => (
        <section key={group.category} className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            {group.category}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {group.protocols.map((p) => (
              <ProtocolCard key={p.id} protocol={p} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
