import type { JwtPayload } from "@/lib/types";
import { decodeJwt, describeClaim } from "@/lib/jwt";
import { Annotations } from "./Annotations";
import { TerminalFrame } from "./TerminalFrame";

const SEGMENT_COLORS = ["text-term-red", "text-term-magenta", "text-term-cyan"];

/**
 * Decodes a JWT client-side and shows the three color-coded segments
 * (header.payload.signature) plus the decoded JSON. Teaches token structure;
 * does not verify the signature.
 */
export function JwtViewer({ payload }: { payload: JwtPayload }) {
  const decoded = decodeJwt(payload.token);
  const segments = [decoded.raw.header, decoded.raw.payload, decoded.raw.signature];

  return (
    <div>
      {/* Color-coded compact token */}
      <TerminalFrame title="jwt.decode()">
        <div className="overflow-x-auto font-mono text-xs leading-relaxed break-all">
          {segments.map((seg, i) => (
            <span key={i}>
              <span className={SEGMENT_COLORS[i]}>{seg}</span>
              {i < 2 && <span className="text-term-dim">.</span>}
            </span>
          ))}
        </div>
      </TerminalFrame>

      {decoded.error && (
        <p className="mt-2 text-xs text-term-red">⚠ {decoded.error}</p>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <DecodedBlock title="Header" color={SEGMENT_COLORS[0]} obj={decoded.header} />
        <DecodedBlock title="Payload (claims)" color={SEGMENT_COLORS[1]} obj={decoded.payload} />
      </div>

      <p className="mt-2 font-mono text-[11px] text-term-dim">
        <span className={SEGMENT_COLORS[2]}>signature</span> — verified by the
        recipient using the issuer&apos;s key (not decoded here).
      </p>

      <Annotations items={payload.annotations} />
    </div>
  );
}

function DecodedBlock({
  title,
  color,
  obj,
}: {
  title: string;
  color: string;
  obj: Record<string, unknown> | null;
}) {
  return (
    <div className="rounded-md border border-term-border bg-term-panel/40 p-3">
      <div className={`mb-1 font-mono text-xs font-semibold ${color}`}>
        {"// "}
        {title}
      </div>
      {obj ? (
        <ul className="space-y-0.5 font-mono text-xs">
          {Object.entries(obj).map(([k, v]) => {
            const human = describeClaim(k, v);
            return (
              <li key={k} className="break-all">
                <span className="text-term-dim">{k}</span>
                <span className="text-term-dim">: </span>
                <span className="text-term-fg">{JSON.stringify(v)}</span>
                {human && (
                  <span className="ml-1 text-term-green">{`// ${human}`}</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-term-dim">—</p>
      )}
    </div>
  );
}
