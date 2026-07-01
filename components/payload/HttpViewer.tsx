import type { HttpPayload } from "@/lib/types";
import { Annotations } from "./Annotations";
import { TerminalFrame } from "./TerminalFrame";

const REDIRECT_CODES = new Set(["302", "303"]);

/**
 * Renders an HTTP request (or redirect) with the method/URL, broken-out query
 * parameters, headers, and body. Query params are the teaching focus for OAuth
 * redirects, so they get their own table.
 */
export function HttpViewer({ payload }: { payload: HttpPayload }) {
  const isRedirect = REDIRECT_CODES.has(payload.method);
  return (
    <div className="space-y-3 font-mono text-xs">
      <TerminalFrame title="request">
        <span className="text-slate-600">$ </span>
        <span
          className={`font-semibold ${isRedirect ? "text-amber-300" : "text-emerald-400"}`}
        >
          {isRedirect ? `${payload.method} Redirect →` : payload.method}
        </span>{" "}
        <span className="break-all text-slate-200">{payload.url}</span>
      </TerminalFrame>

      {payload.query && Object.keys(payload.query).length > 0 && (
        <KeyValueTable title="// query parameters" data={payload.query} highlightKeys />
      )}
      {payload.headers && Object.keys(payload.headers).length > 0 && (
        <KeyValueTable title="// headers" data={payload.headers} />
      )}
      {payload.body && (
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {"// body"}
          </div>
          <TerminalFrame>
            <pre className="whitespace-pre-wrap break-all text-slate-200">
              {payload.body}
            </pre>
          </TerminalFrame>
        </div>
      )}

      <Annotations items={payload.annotations} />
    </div>
  );
}

function KeyValueTable({
  title,
  data,
  highlightKeys,
}: {
  title: string;
  data: Record<string, string>;
  highlightKeys?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <div className="overflow-hidden rounded-md border border-slate-700/60">
        <table className="w-full border-collapse font-mono">
          <tbody>
            {Object.entries(data).map(([k, v], i) => (
              <tr
                key={k}
                className={i % 2 ? "bg-slate-900/40" : "bg-slate-950/40"}
              >
                <td
                  className={`w-40 border-r border-slate-800 px-2 py-1 align-top ${
                    highlightKeys ? "text-amber-300" : "text-slate-400"
                  }`}
                >
                  {k}
                </td>
                <td className="px-2 py-1 align-top break-all text-slate-200">
                  {v}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
