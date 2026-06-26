# IAM Protocol Academy

Interactive, educational walkthroughs of IAM and security protocols. Step through
real flows (OAuth 2.0, OpenID Connect, …), inspect the inputs and outputs at each
step, and decode the tokens and payloads exchanged — all in a static site you can
host anywhere.

## Why it exists

Protocol specs are dense and diagrams are static. This app makes each flow
**clickable**: select any message to see who sends it, what it carries, and why
each field matters — including a live JWT decoder for ID tokens.

## Architecture

A **protocol registry + flow engine**. Content is pure data; a generic engine
renders it. Adding a new flow is a near-mechanical, drop-in operation — which also
makes the project a target for **autonomous AI development** (see below).

```
content/protocols/<protocol>/
  meta.ts                       # protocol metadata
  flows/<flow>/
    steps.ts                    # typed Flow: actors, steps, payloads  (the data)
    content.mdx                 # educational prose
lib/         schema.ts (Zod contract) + types.ts (derived) + jwt.ts
components/  flow/ (diagram, inspector, toggles) + payload/ (jwt, http, xml, raw viewers)
app/         landing + /[protocol] + /[protocol]/[flow] (statically generated)
scripts/     build-registry.ts (auto-discovery codegen) + validate-content.ts (CI gate)
```

The Zod schema in `lib/schema.ts` is the single source of truth; TypeScript types
are derived from it, and `validate-content` runs every flow through it.

## Develop

```bash
npm install
npm run dev          # http://localhost:3000
npm run check        # typecheck + validate-content + lint + build (the CI gate)
npm run build        # static export to ./out
```

Node 20+ recommended.

## Add a protocol or flow

See **[AGENTS.md](./AGENTS.md)** for the full spec. In short: copy
`content/_template/flow/` into `content/protocols/<protocol>/flows/<flow>/`, fill in
`steps.ts` + `content.mdx`, and run `npm run check`. No engine code to touch.

## Autonomous flow authoring

This repo is wired so new flows can be built by a coding agent and approved by you.

**One-time setup:** install the [Claude GitHub App](https://github.com/apps/claude)
on the repo, add the `ANTHROPIC_API_KEY` repo secret, and allow Actions to create
PRs (Settings → Actions → General → Workflow permissions).

Then:

1. **File a request** — open a *New Flow Request* issue (GitHub → Issues → New
   Flow Request) and add the `new-flow` label.
2. **Agent builds it** — the Claude Code GitHub Action (`.github/workflows/claude.yml`)
   reads the issue, implements the flow per AGENTS.md, and opens a PR.
3. **You approve** — CI gates (`.github/workflows/ci.yml`: typecheck, content
   validation, lint, build) must pass, and Vercel posts a **preview deployment**.
   Click through the new flow page, then merge. Merge to `main` deploys to
   production.

You can also `@claude` on any issue or PR comment to ask for changes.

## Deploy

Static export (`output: "export"`). Connect the repo to **Vercel** (zero config):
production deploys from `main`, preview deploys per PR. Any static host works too —
serve the `out/` directory.
