import type { Payload } from "@/lib/types";
import { JwtViewer } from "./JwtViewer";
import { HttpViewer } from "./HttpViewer";
import { RawViewer, XmlViewer } from "./RawViewer";

/**
 * Switches on the payload's `kind` to render the right viewer. This is the one
 * place that maps payload types to UI — add a `case` here when you add a new
 * payload variant to the schema.
 */
export function PayloadViewer({ payload }: { payload: Payload }) {
  switch (payload.kind) {
    case "jwt":
      return <JwtViewer payload={payload} />;
    case "http":
      return <HttpViewer payload={payload} />;
    case "xml":
      return <XmlViewer payload={payload} />;
    case "raw":
      return <RawViewer payload={payload} />;
    default: {
      // Exhaustiveness guard: TS errors here if a payload kind is unhandled.
      const _never: never = payload;
      return _never;
    }
  }
}
