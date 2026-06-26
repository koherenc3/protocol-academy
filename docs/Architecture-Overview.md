# Architecture Overview

The system has four layers. The bottom two are a normal web app; the top two are
what make it an agentic-delivery proof of concept.

```
┌─────────────────────────────────────────────────────────────────────┐
│ 4. AGENTIC LAYER  (GitHub Actions + Anthropic API)                    │
│    • Author agent      .github/workflows/claude.yml                   │
│    • Reviewer agent    .github/workflows/flow-review.yml              │
│    • Request surface   .github/ISSUE_TEMPLATE/new-flow.yml            │
│    • Agent spec        AGENTS.md / CLAUDE.md                          │
├─────────────────────────────────────────────────────────────────────┤
│ 3. DELIVERY LAYER  (CI/CD)                                            │
│    • CI gate           .github/workflows/ci.yml                       │
│    • Hosting + preview  Vercel  (vercel.json)                         │
├─────────────────────────────────────────────────────────────────────┤
│ 2. CONTENT ENGINE  (build-time "backend")                            │
│    • Contract          lib/schema.ts  (Zod, single source of truth)  │
│    • Types             lib/types.ts   (derived via z.infer)          │
│    • Auto-discovery     scripts/build-registry.ts → *.generated.ts   │
│    • Registry + gate    content/registry.ts, scripts/validate-content│
├─────────────────────────────────────────────────────────────────────┤
│ 1. PRESENTATION  (Next.js static export)                             │
│    • Flow engine        components/flow/**, components/payload/**     │
│    • Routes             app/**  (statically generated)               │
│    • Content            content/protocols/<p>/flows/<f>/**           │
└─────────────────────────────────────────────────────────────────────┘
```

## Layer 1 — Presentation (the app)

A **Next.js (App Router) site exported as static files** (`output: "export"`).
There is no runtime server: everything is pre-rendered at build and served as
static HTML/JS by Vercel. The interactive parts (stepping through a flow,
decoding a JWT, the topology view) are client components hydrated in the browser.

Key building blocks:
- **Flow engine** — a generic, data-driven renderer (`components/flow/**`): an
  animated sequence diagram, an opt-in React Flow topology view, and a
  type-switched payload viewer (`components/payload/**`) including a live JWT
  decoder.
- **Routes** — `app/page.tsx` (landing), `app/[protocol]/page.tsx`,
  `app/[protocol]/[flow]/page.tsx`, all enumerated by `generateStaticParams`.

## Layer 2 — Content Engine (the "backend")

This is the part most people wouldn't expect on a static site, and it's central
to the agentic story. A **feature is data, not code**: each flow is a typed
`steps.ts` (actors, steps, payloads) + a `content.mdx` (prose). A **Zod schema is
the single source of truth**; TypeScript types are derived from it, and a
codegen step auto-discovers flows on disk and emits static import maps. A
validation script runs every flow through the schema as a CI gate.

Because the engine is generic and the contract is enforced, **adding a feature
never requires touching application code** — which is exactly what makes the work
safe to hand to an agent. Full detail in **[The Content Engine](The-Content-Engine.md)**.

## Layer 3 — Delivery (CI/CD)

- **CI** (`ci.yml`) runs on every push/PR: `typecheck → unit test →
  validate-content → lint → build`. These are the *mechanical* guarantees.
- **Vercel** builds via `npm run build` (set in `vercel.json` so the codegen
  pre-step runs), deploys `main` to production and every PR to a **preview URL** —
  the artifact a human actually reviews.

## Layer 4 — Agentic (the proof of concept)

- **Request surface** — a structured GitHub Issue form (`new-flow.yml`).
- **Author agent** (`claude.yml`) — triggered by a labeled issue or an `@claude`
  mention; implements the request per `AGENTS.md` and opens a PR.
- **Reviewer agent** (`flow-review.yml`) — triggered by any PR touching
  `content/protocols/**`; fetches the cited specs and posts an accuracy review.
- **Spec** — `AGENTS.md` is the contract the author agent follows and the
  "definition of done"; `CLAUDE.md` points tools at it.

The two agents never talk directly; they communicate through the same artifacts
humans use — issues, branches, PRs, and comments. That's the whole point: the
agent is a participant in normal software delivery, subject to the same gates.

See **[The Agentic Pipeline](The-Agentic-Pipeline.md)** for the end-to-end flow.

## Technology choices at a glance

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router, static export) | Pre-render everything; host anywhere; no server to operate |
| Styling | Tailwind CSS | Fast, consistent, purge-friendly |
| Diagrams | Custom React + framer-motion; React Flow (topology) | Full control over interactivity; data-driven |
| Contract | Zod | One schema → runtime validation *and* derived types |
| Content | MDX (prose) + typed data (`steps.ts`) | Decouple narrative from machine-checkable structure |
| CI/CD | GitHub Actions + Vercel | PRs, gates, and preview deploys with no bespoke infra |
| Agents | `anthropics/claude-code-action` + Claude GitHub App | Agents act through GitHub primitives |
