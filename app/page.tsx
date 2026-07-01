import { getProtocolsByCategory } from "@/content/registry";
import { ProtocolCard } from "@/components/nav/ProtocolCard";

export default function HomePage() {
  const groups = getProtocolsByCategory();

  return (
    <div>
      <section className="term-panel mb-12 px-5 py-6 sm:px-8 sm:py-8">
        <p className="mb-3 text-xs text-term-dim">
          <span className="text-term-green">root@academy</span>
          <span className="text-term-dim">:</span>
          <span className="text-term-cyan">~</span>
          <span className="text-term-dim">$</span> cat mission.txt
        </p>
        <h1 className="font-display text-4xl leading-tight tracking-wide text-term-green text-glow sm:text-5xl">
          Learn IAM &amp; security protocols
          <br />
          by stepping through them.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-term-fg/90 sm:text-base">
          Each protocol is an interactive walkthrough: click through every
          message in the flow, inspect the real inputs and outputs, and
          decode the tokens and payloads exchanged at each step.
        </p>
        <p className="mt-4 text-xs text-term-dim">
          <span className="text-term-amber">warning:</span> illustrative
          payloads only &mdash; do not paste real credentials.
          <span className="ml-1 inline-block h-3 w-2 translate-y-0.5 bg-term-amber animate-caret" />
        </p>
      </section>

      {groups.map((group) => (
        <section key={group.category} className="mb-12">
          <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-term-cyan">
            <span className="text-term-dim">$</span> ls ./
            {group.category.toLowerCase().replace(/\s+/g, "-")}
            <span className="h-px flex-1 bg-term-border" />
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
