import type { RawPayload, XmlPayload } from "@/lib/types";
import { Annotations } from "./Annotations";

/** Fallback viewer for raw text / code payloads. */
export function RawViewer({ payload }: { payload: RawPayload }) {
  return (
    <div>
      {payload.label && (
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {payload.label}
        </div>
      )}
      <pre className="overflow-x-auto rounded-md border border-slate-700/60 bg-slate-950 p-3 font-mono text-xs text-slate-200 whitespace-pre-wrap break-all">
        {payload.content}
      </pre>
      <Annotations items={payload.annotations} />
    </div>
  );
}

/**
 * Stub XML viewer for SAML and similar (added now so the payload union and the
 * PayloadViewer switch are complete). Renders pretty-printed XML; a richer
 * tree/highlighting view can replace this when SAML lands.
 */
export function XmlViewer({ payload }: { payload: XmlPayload }) {
  return (
    <div>
      <pre className="overflow-x-auto rounded-md border border-slate-700/60 bg-slate-950 p-3 font-mono text-xs text-sky-200 whitespace-pre-wrap break-all">
        {payload.xml}
      </pre>
      <Annotations items={payload.annotations} />
    </div>
  );
}
