import type { XmlPayload } from "@/lib/types";
import { formatXml, type XmlLine } from "@/lib/xml";
import { Annotations } from "./Annotations";

const ATTR_RE = /([\w:.-]+)\s*=\s*"([^"]*)"|([\w:.-]+)\s*=\s*'([^']*)'/g;

/** Renders one tag (open/close/self) with element name + attributes colored. */
function Tag({ raw }: { raw: string }) {
  const isClose = raw.startsWith("</");
  const selfClose = raw.endsWith("/>");
  const inner = raw.replace(/^<\/?/, "").replace(/\s*\/?>$/, "");
  const nameMatch = inner.match(/^([\w:.-]+)/);
  const name = nameMatch ? nameMatch[1] : inner;
  const rest = inner.slice(name.length);

  const attrs: { n: string; v: string }[] = [];
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(rest)) !== null) {
    attrs.push({ n: m[1] ?? m[3], v: m[2] ?? m[4] });
  }

  return (
    <span>
      <span className="text-slate-500">{isClose ? "</" : "<"}</span>
      <span className="text-sky-300">{name}</span>
      {attrs.map((a, i) => (
        <span key={i}>
          {" "}
          <span className="text-amber-300">{a.n}</span>
          <span className="text-slate-500">=</span>
          <span className="text-emerald-300">{`"${a.v}"`}</span>
        </span>
      ))}
      <span className="text-slate-500">{selfClose ? " />" : ">"}</span>
    </span>
  );
}

function Line({ line }: { line: XmlLine }) {
  const style = { paddingLeft: line.depth * 14 };
  switch (line.kind) {
    case "open":
    case "close":
    case "self":
      return (
        <div style={style} className="break-all">
          <Tag raw={line.raw} />
        </div>
      );
    case "comment":
      return (
        <div style={style} className="break-all italic text-slate-500">
          {line.raw}
        </div>
      );
    case "decl":
      return (
        <div style={style} className="break-all text-slate-500">
          {line.raw}
        </div>
      );
    default: // text / cdata
      return (
        <div style={style} className="break-all text-slate-200">
          {line.raw}
        </div>
      );
  }
}

/**
 * Pretty-prints and syntax-highlights XML (SAML assertions, metadata, etc.):
 * indents by nesting depth and colors elements/attributes/values/text. Pairs
 * with the `annotations` callouts to explain security-critical elements.
 */
export function XmlViewer({ payload }: { payload: XmlPayload }) {
  const lines = formatXml(payload.xml);
  return (
    <div>
      <div className="overflow-x-auto rounded-md border border-slate-700/60 bg-slate-950 p-3 font-mono text-xs leading-relaxed">
        {lines.map((line, i) => (
          <Line key={i} line={line} />
        ))}
      </div>
      <Annotations items={payload.annotations} />
    </div>
  );
}
