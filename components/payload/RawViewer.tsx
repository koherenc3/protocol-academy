import type { RawPayload } from "@/lib/types";
import { Annotations } from "./Annotations";
import { TerminalFrame } from "./TerminalFrame";

/** Fallback viewer for raw text / code payloads. */
export function RawViewer({ payload }: { payload: RawPayload }) {
  return (
    <div>
      <TerminalFrame title={payload.label ?? payload.language ?? "output"}>
        <pre className="overflow-x-auto font-mono text-xs text-term-fg whitespace-pre-wrap break-all">
          {payload.content}
        </pre>
      </TerminalFrame>
      <Annotations items={payload.annotations} />
    </div>
  );
}
