// Turns the Security Architect's flow-review.json verdict into a Markdown
// summary (flow-review.md) and the job summary. Dependency-free so the review
// workflow doesn't need an npm install. Always exits 0 — this is advisory.
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";

const OUT = "flow-review.md";
const SEVERITY = {
  critical: { emoji: "🔴", rank: 0 },
  major: { emoji: "🟠", rank: 1 },
  minor: { emoji: "🟡", rank: 2 },
};

const HEADER = "## 🛡️ Security Architect — Accuracy Review\n\n";
const FOOTER =
  "\n\n_Advisory only — this review does not block merge. Dismiss anything you disagree with; if a finding cites the wrong spec, the reviewer can be wrong too._";

function cell(s) {
  return String(s ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

function write(md) {
  writeFileSync(OUT, md);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  }
  console.log(md);
}

if (!existsSync("flow-review.json")) {
  write(
    HEADER +
      "⚠️ **The accuracy review did not complete** — the reviewer produced no verdict (an API/tool error, or no spec could be fetched). Please re-run the job or review this content manually." +
      FOOTER,
  );
  process.exit(0);
}

let data;
try {
  data = JSON.parse(readFileSync("flow-review.json", "utf8"));
} catch {
  write(
    HEADER +
      "⚠️ **The reviewer's output could not be parsed** (`flow-review.json` was not valid JSON). Please review this content manually." +
      FOOTER,
  );
  process.exit(0);
}

const findings = Array.isArray(data.findings) ? data.findings : [];
const overall = data.overall ?? (findings.length ? "issues_found" : "clean");

let banner;
if (overall === "clean") {
  banner = "✅ **No accuracy issues found** against the cited specifications.";
} else if (overall === "unable_to_verify") {
  banner =
    "⚠️ **Could not fully verify** — the primary spec sources were unavailable. Manual review recommended.";
} else {
  const counts = findings.reduce((m, f) => {
    m[f.severity] = (m[f.severity] || 0) + 1;
    return m;
  }, {});
  const parts = ["critical", "major", "minor"]
    .filter((s) => counts[s])
    .map((s) => `${counts[s]} ${s}`);
  banner = `⚠️ **${findings.length} potential ${
    findings.length === 1 ? "inaccuracy" : "inaccuracies"
  } found** (${parts.join(", ")}). Review before merging.`;
}

let md = HEADER + banner + "\n\n";
if (data.summary) md += `${data.summary}\n\n`;

if (findings.length) {
  findings.sort(
    (a, b) =>
      (SEVERITY[a.severity]?.rank ?? 9) - (SEVERITY[b.severity]?.rank ?? 9),
  );
  md += "| Severity | Where | Issue | Correction | Citation |\n";
  md += "| --- | --- | --- | --- | --- |\n";
  for (const f of findings) {
    const sev = SEVERITY[f.severity]?.emoji
      ? `${SEVERITY[f.severity].emoji} ${f.severity}`
      : cell(f.severity);
    const where = `\`${cell(f.file)}\`${f.location ? ` (${cell(f.location)})` : ""}`;
    const issue = `${cell(f.problem)}${f.claim ? ` _(claim: ${cell(f.claim)})_` : ""}`;
    md += `| ${sev} | ${where} | ${issue} | ${cell(f.correction)} | ${cell(f.citation)} |\n`;
  }
}

if (Array.isArray(data.specsConsulted) && data.specsConsulted.length) {
  md += `\n**Specs consulted:** ${data.specsConsulted.map((u) => cell(u)).join(", ")}`;
}

write(md + FOOTER);
