import type { RawPayload } from "@/lib/types";
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
