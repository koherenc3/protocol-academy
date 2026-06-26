import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllFlowParams, getFlow, getProtocol } from "@/content/registry";
import { flowContent } from "@/content/content.generated";
import { FlowViewer } from "@/components/flow/FlowViewer";

export function generateStaticParams() {
  return getAllFlowParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ protocol: string; flow: string }>;
}): Promise<Metadata> {
  const { protocol, flow } = await params;
  const f = getFlow(protocol, flow);
  return { title: f?.title ?? "Flow", description: f?.summary };
}

export default async function FlowPage({
  params,
}: {
  params: Promise<{ protocol: string; flow: string }>;
}) {
  const { protocol, flow } = await params;
  const p = getProtocol(protocol);
  const f = getFlow(protocol, flow);
  if (!p || !f) notFound();

  const Body = flowContent[`${protocol}/${flow}`];

  return (
    <div>
      <nav className="mb-4 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Home
        </Link>{" "}
        /{" "}
        <Link href={`/${p.id}/`} className="hover:text-slate-300">
          {p.name}
        </Link>{" "}
        / <span className="text-slate-300">{f.title}</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">{f.title}</h1>
        <p className="mt-2 max-w-2xl text-slate-400">{f.summary}</p>
        {f.specRefs && f.specRefs.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {f.specRefs.map((ref) => (
              <a
                key={ref.url}
                href={ref.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-slate-700 px-2.5 py-0.5 text-xs text-slate-300 hover:border-amber-400/60 hover:text-amber-200"
              >
                {ref.label} ↗
              </a>
            ))}
          </div>
        )}
      </header>

      <FlowViewer flow={f} />

      {Body && (
        <article className="prose-flow mt-10 border-t border-slate-800 pt-8">
          <Body />
        </article>
      )}
    </div>
  );
}
