// Generates GitHub wiki content from docs/ (the single source of truth).
// docs/ is canonical because its changes go through PRs + CI; the wiki is a
// generated mirror. Run by .github/workflows/publish-wiki.yml on docs/ changes.
//
// Transform (inverse of how docs/ was authored from the wiki):
//   - docs/README.md            -> Home.md   (the wiki landing page)
//   - docs/<Page>.md            -> <Page>.md
//   - in-repo links ](<Page>.md) -> wiki links ](<Page>)   (and README.md -> Home)
//   - generate _Sidebar.md navigation
//
// Dependency-free Node ESM so the workflow needs no install.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const IN = "docs";
const OUT = "wiki-build";

// Preferred sidebar order; any extra pages are appended alphabetically.
const ORDER = [
  "README",
  "Architecture-Overview",
  "The-Agentic-Pipeline",
  "The-Content-Engine",
  "Design-Decisions-and-Lessons",
  "Operations-and-Extending",
];

const wikiName = (base) => (base === "README" ? "Home" : base);
const h1 = (md) => {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
};
const label = (base, md) => {
  if (base === "README") return "Home";
  const title = h1(md) || base.replace(/-/g, " ");
  return title.replace(/\s*\(.*?\)\s*$/, "").trim(); // drop trailing "(…)"
};

const files = readdirSync(IN).filter((f) => f.endsWith(".md"));
const bases = files.map((f) => f.replace(/\.md$/, ""));

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const labels = {};
for (const f of files) {
  const base = f.replace(/\.md$/, "");
  let md = readFileSync(join(IN, f), "utf8");
  // Rewrite every in-repo doc link to its wiki page name.
  for (const b of bases) {
    md = md.split(`](${b}.md)`).join(`](${wikiName(b)})`);
  }
  labels[base] = label(base, md);
  writeFileSync(join(OUT, `${wikiName(base)}.md`), md);
}

// Sidebar nav (ordered).
const ordered = [
  ...ORDER.filter((b) => bases.includes(b)),
  ...bases.filter((b) => !ORDER.includes(b)).sort(),
];
const nav = ordered
  .map((b) => `- [${labels[b]}](${wikiName(b)})`)
  .join("\n");

const sidebar = `### Protocol Academy

**Proof of concept: agentic delivery to production**

${nav}

---
[Live app](https://protocol-academy-iota.vercel.app) · [Repo](https://github.com/koherenc3/protocol-academy)

_Generated from \`docs/\` — edit there, not here._
`;
writeFileSync(join(OUT, "_Sidebar.md"), sidebar);

console.log(
  `[build-wiki] wrote ${ordered.length} page(s) + _Sidebar to ${OUT}/`,
);
