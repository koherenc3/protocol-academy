import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllProtocols, getProtocol } from "@/content/registry";

export function generateStaticParams() {
  return getAllProtocols().map((p) => ({ protocol: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ protocol: string }>;
}): Promise<Metadata> {
  const { protocol } = await params;
  const p = getProtocol(protocol);
  return { title: p?.name ?? "Protocol", description: p?.summary };
}

export default async function ProtocolPage({
  params,
}: {
  params: Promise<{ protocol: string }>;
}) {
  const { protocol } = await params;
  const p = getProtocol(protocol);
  if (!p) notFound();

  return (
    <div>
      <nav className="mb-4 font-mono text-xs text-term-dim">
        <span className="text-term-green">~</span>{" "}
        <Link href="/" className="hover:text-term-green">
          home
        </Link>{" "}
        <span className="text-term-border-bright">/</span>{" "}
        <span className="text-term-fg">{p.id}</span>
      </nav>

      <header className="mb-8">
        <span className="rounded-sm border border-term-border bg-term-panel px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-term-green">
          {p.category}
        </span>
        <h1 className="mt-2 font-mono text-3xl font-bold text-term-fg">
          <span className="text-term-green">#</span> {p.name}
        </h1>
        <p className="mt-2 max-w-2xl text-term-dim">{p.summary}</p>
      </header>

      <h2 className="mb-3 font-mono text-sm font-semibold uppercase tracking-wide text-term-dim">
        <span className="text-term-green">$</span> ls ./flows
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {p.flows.map((f) => (
          <li key={f.id}>
            <Link
              href={`/${p.id}/${f.id}/`}
              className="group block h-full rounded-lg border border-term-border bg-term-panel/40 p-4 transition-colors hover:border-term-green/60 hover:bg-term-panel/70"
            >
              <h3 className="font-mono font-semibold text-term-fg group-hover:text-term-green">
                <span className="text-term-dim">{"> "}</span>
                {f.title}
              </h3>
              <p className="mt-1 text-sm text-term-dim">{f.summary}</p>
              <span className="mt-2 inline-block font-mono text-xs text-term-dim group-hover:text-term-green/80">
                [{f.steps.length} steps] →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
