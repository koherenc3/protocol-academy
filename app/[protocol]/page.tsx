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
      <nav className="mb-4 font-mono text-xs text-slate-500">
        <span className="text-emerald-500">~</span>{" "}
        <Link href="/" className="hover:text-emerald-300">
          home
        </Link>{" "}
        <span className="text-slate-700">/</span>{" "}
        <span className="text-slate-300">{p.id}</span>
      </nav>

      <header className="mb-8">
        <span className="rounded-sm border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-emerald-400">
          {p.category}
        </span>
        <h1 className="mt-2 font-mono text-3xl font-bold text-slate-100">
          <span className="text-emerald-500">#</span> {p.name}
        </h1>
        <p className="mt-2 max-w-2xl text-slate-400">{p.summary}</p>
      </header>

      <h2 className="mb-3 font-mono text-sm font-semibold uppercase tracking-wide text-slate-500">
        <span className="text-emerald-500">$</span> ls ./flows
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {p.flows.map((f) => (
          <li key={f.id}>
            <Link
              href={`/${p.id}/${f.id}/`}
              className="group block h-full rounded-lg border border-slate-700/60 bg-slate-900/40 p-4 transition-colors hover:border-emerald-400/60 hover:bg-slate-900/70"
            >
              <h3 className="font-mono font-semibold text-slate-100 group-hover:text-emerald-300">
                <span className="text-slate-600">{"> "}</span>
                {f.title}
              </h3>
              <p className="mt-1 text-sm text-slate-400">{f.summary}</p>
              <span className="mt-2 inline-block font-mono text-xs text-slate-600 group-hover:text-emerald-400/80">
                [{f.steps.length} steps] →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
