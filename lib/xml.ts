/**
 * Tiny, dependency-free XML pretty-printer for the XmlViewer (SAML assertions,
 * etc.). Tokenizes an XML string and assigns each token an indentation depth and
 * a kind, so the component can render it indented and syntax-highlighted. It does
 * not validate or fully parse XML — the goal is readable display of realistic
 * (often single-line) SAML payloads.
 */
export type XmlLineKind =
  | "open"
  | "close"
  | "self"
  | "text"
  | "comment"
  | "decl"
  | "cdata";

export interface XmlLine {
  depth: number;
  kind: XmlLineKind;
  raw: string;
}

// Order matters: comments / CDATA / declarations before the general tag match.
const TOKEN_RE =
  /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<\/?[^>]*>|[^<]+/g;

function classify(t: string): XmlLineKind {
  if (t.startsWith("<!--")) return "comment";
  if (t.startsWith("<![CDATA[")) return "cdata";
  if (t.startsWith("<?")) return "decl";
  if (t.startsWith("</")) return "close";
  if (t.startsWith("<")) return t.endsWith("/>") ? "self" : "open";
  return "text";
}

export function formatXml(xml: string): XmlLine[] {
  const lines: XmlLine[] = [];
  let depth = 0;
  for (const tok of xml.match(TOKEN_RE) ?? []) {
    const t = tok.trim();
    if (!t) continue; // skip whitespace between tags
    const kind = classify(t);
    if (kind === "close") {
      depth = Math.max(0, depth - 1);
      lines.push({ depth, kind, raw: t });
    } else if (kind === "open") {
      lines.push({ depth, kind, raw: t });
      depth += 1;
    } else {
      lines.push({ depth, kind, raw: t });
    }
  }
  return lines;
}
