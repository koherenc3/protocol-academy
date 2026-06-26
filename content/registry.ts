import { FlowSchema, ProtocolMetaSchema, validateFlowReferences } from "@/lib/schema";
import type { Flow, Protocol } from "@/lib/types";
import { rawProtocols } from "./registry.generated";

/**
 * The registry: validated, assembled protocols + flows for the whole app.
 *
 * Data is auto-discovered (see scripts/build-registry.ts) and validated here
 * against the Zod contract at module load. A malformed flow throws with a
 * located message rather than silently rendering broken pages.
 *
 * This module imports DATA ONLY (no MDX) so it is safe to use from the Node
 * validation script as well as from server components.
 */
function buildProtocols(): Protocol[] {
  const protocols: Protocol[] = rawProtocols.map(({ meta, flows }) => {
    const parsedMeta = ProtocolMetaSchema.parse(meta);
    const parsedFlows: Flow[] = flows.map((flow) => {
      const parsed = FlowSchema.parse(flow);
      const refProblems = validateFlowReferences(parsed);
      if (refProblems.length > 0) {
        throw new Error(
          `Flow "${parsedMeta.id}/${parsed.id}" has reference errors:\n  - ${refProblems.join("\n  - ")}`,
        );
      }
      if (parsed.protocolId !== parsedMeta.id) {
        throw new Error(
          `Flow "${parsed.id}" declares protocolId "${parsed.protocolId}" but lives under protocol "${parsedMeta.id}"`,
        );
      }
      return parsed;
    });
    return { ...parsedMeta, flows: parsedFlows };
  });

  return protocols.sort(
    (a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name),
  );
}

const protocols = buildProtocols();

export function getAllProtocols(): Protocol[] {
  return protocols;
}

export function getProtocol(id: string): Protocol | undefined {
  return protocols.find((p) => p.id === id);
}

export function getFlow(protocolId: string, flowId: string): Flow | undefined {
  return getProtocol(protocolId)?.flows.find((f) => f.id === flowId);
}

/** Every (protocol, flow) pair — used for static path generation. */
export function getAllFlowParams(): { protocol: string; flow: string }[] {
  return protocols.flatMap((p) =>
    p.flows.map((f) => ({ protocol: p.id, flow: f.id })),
  );
}

/** Group protocols by their `category` for the landing page. */
// Preferred display order for the coarse landing-page buckets; unknown
// categories sort after these, alphabetically.
const CATEGORY_ORDER = ["Authentication", "Authorization", "Workload Identity"];

export function getProtocolsByCategory(): { category: string; protocols: Protocol[] }[] {
  const byCat = new Map<string, Protocol[]>();
  for (const p of protocols) {
    const list = byCat.get(p.category) ?? [];
    list.push(p);
    byCat.set(p.category, list);
  }
  const rank = (c: string) => {
    const i = CATEGORY_ORDER.indexOf(c);
    return i === -1 ? CATEGORY_ORDER.length : i;
  };
  return [...byCat.entries()]
    .map(([category, protocols]) => ({ category, protocols }))
    .sort((a, b) => rank(a.category) - rank(b.category) || a.category.localeCompare(b.category));
}
