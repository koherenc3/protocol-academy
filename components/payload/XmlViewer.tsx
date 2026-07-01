import type { XmlPayload } from "@/lib/types";
import { formatXml, type XmlLine } from "@/lib/xml";
import { Annotations } from "./Annotations";
import { TerminalFrame } from "./TerminalFrame";

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
      <span className="text-term-dim">{isClose ? "</" : "<"}</span>
      <span className="text-term-cyan">{name}</span>
      {attrs.map((a, i) => (
        <span key={i}>
          {" "}
          <span className="text-term-amber">{a.n}</span>
          <span className="text-term-dim">=</span>
          <span className="text-term-green">{`"${a.v}"`}</span>
        </span>
      ))}
      <span className="text-term-dim">{selfClose ? " />" : ">"}</span>
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
        <div style={style} className="break-all italic text-term-dim">
          {line.raw}
        </div>
      );
    case "decl":
      return (
        <div style={style} className="break-all text-term-dim">
          {line.raw}
        </div>
      );
    default: // text / cdata
      return (
        <div style={style} className="break-all text-term-fg">
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
      <TerminalFrame title="assertion.xml">
        <div className="overflow-x-auto font-mono text-xs leading-relaxed">
          {lines.map((line, i) => (
            <Line key={i} line={line} />
          ))}
        </div>
      </TerminalFrame>
      <Annotations items={payload.annotations} />
    </div>
  );
}
