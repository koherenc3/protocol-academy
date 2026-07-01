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
      <nav className="mb-4 font-mono text-xs text-term-dim">
        <span className="text-term-green">~</span>{" "}
        <Link href="/" className="hover:text-term-green">
          home
        </Link>{" "}
        <span className="text-term-border-bright">/</span>{" "}
        <Link href={`/${p.id}/`} className="hover:text-term-green">
          {p.id}
        </Link>{" "}
        <span className="text-term-border-bright">/</span>{" "}
        <span className="text-term-fg">{f.id}</span>
      </nav>

      <header className="mb-6">
        <h1 className="font-mono text-2xl font-bold text-term-fg">
          <span className="text-term-green">#</span> {f.title}
        </h1>
        <p className="mt-2 max-w-2xl text-term-dim">{f.summary}</p>
        {f.specRefs && f.specRefs.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {f.specRefs.map((ref) => (
              <a
                key={ref.url}
                href={ref.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-sm border border-term-border px-2.5 py-0.5 font-mono text-xs text-term-dim hover:border-term-green/60 hover:text-term-green"
              >
                man {ref.label} ↗
              </a>
            ))}
          </div>
        )}
      </header>

      <FlowViewer flow={f} />

      {Body && (
        <article className="prose-flow mt-10 border-t border-term-border pt-8">
          <Body />
        </article>
      )}
    </div>
  );
}
