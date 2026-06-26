import type { JwtPayload } from "@/lib/types";
import { decodeJwt, describeClaim } from "@/lib/jwt";
import { Annotations } from "./Annotations";

const SEGMENT_COLORS = ["text-rose-400", "text-violet-400", "text-sky-400"];

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
      <div className="overflow-x-auto rounded-md border border-slate-700/60 bg-slate-950 p-3 font-mono text-xs leading-relaxed break-all">
        {segments.map((seg, i) => (
          <span key={i}>
            <span className={SEGMENT_COLORS[i]}>{seg}</span>
            {i < 2 && <span className="text-slate-500">.</span>}
          </span>
        ))}
      </div>

      {decoded.error && (
        <p className="mt-2 text-xs text-rose-400">⚠ {decoded.error}</p>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <DecodedBlock title="Header" color={SEGMENT_COLORS[0]} obj={decoded.header} />
        <DecodedBlock title="Payload (claims)" color={SEGMENT_COLORS[1]} obj={decoded.payload} />
      </div>

      <p className="mt-2 font-mono text-[11px] text-slate-500">
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
    <div className="rounded-md border border-slate-700/60 bg-slate-900/40 p-3">
      <div className={`mb-1 text-xs font-semibold ${color}`}>{title}</div>
      {obj ? (
        <ul className="space-y-0.5 font-mono text-xs">
          {Object.entries(obj).map(([k, v]) => {
            const human = describeClaim(k, v);
            return (
              <li key={k} className="break-all">
                <span className="text-slate-400">{k}</span>
                <span className="text-slate-600">: </span>
                <span className="text-slate-200">{JSON.stringify(v)}</span>
                {human && (
                  <span className="ml-1 text-emerald-400">{`// ${human}`}</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-slate-500">—</p>
      )}
    </div>
  );
}
