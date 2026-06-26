# The Content Engine (the "backend")

A static site doesn't have a server, but it does have a **build-time backend**:
the machinery that turns typed content into validated, statically-rendered pages.
This engine is what makes the agentic loop tractable — it reduces "build a
feature" to "write a data file that satisfies a contract."

## Principle: a feature is data, not code

Each protocol flow is two files:

```
content/protocols/<protocol>/
  meta.ts                         # protocol metadata (name, category, summary)
  flows/<flow>/
    steps.ts                      # typed Flow: actors, steps, payloads  (DATA)
    content.mdx                   # educational prose                     (NARRATIVE)
```

The renderer is generic. Adding a flow adds data; it never edits
`components/`, `lib/`, `app/`, or `scripts/`. That invariant is the contract with
the agent — and the reason a new flow can't break the engine.

## The contract: one Zod schema, derived types

`lib/schema.ts` is the **single source of truth**. It defines actors, steps, the
payload union, params, and the flow shape. TypeScript types are *derived* from it
so the compile-time and run-time contracts can never drift:

```ts
// lib/types.ts
export type Flow = z.infer<typeof FlowSchema>;
export type Payload = z.infer<typeof PayloadSchema>;   // discriminated union
```

Payloads are a **discriminated union on `kind`**: `http | jwt | xml | raw`. This
is the seam for new protocols — a new payload type is a new union member plus a
matching viewer, and nothing else in the engine changes.

The schema also encodes cross-field rules a flat type can't (e.g. every step's
`from`/`to` must reference a declared actor; `requires`/`excludes` must reference
a declared param) via `validateFlowReferences()`.

## Auto-discovery via codegen

Bundlers want *static* imports, but we want *zero* central lists to edit (so an
agent just drops files on disk). `scripts/build-registry.ts` reconciles these: it
globs `content/protocols/**` and emits two generated files with static imports —

- `content/registry.generated.ts` — pure data (meta + flow step definitions)
- `content/content.generated.ts` — a map of `"<protocol>/<flow>" → MDX component`

It runs automatically through npm pre-hooks (`predev`, `prebuild`,
`pretypecheck`, `prevalidate-content`), and the outputs are git-ignored. So a new
flow is picked up just by **existing** — no registry edit, no merge conflicts.

> This split (data file vs. MDX map) is deliberate: the validation script and
> server components import *data only*, so the Node-based gate never has to load
> MDX/React.

## The registry and the validation gate

`content/registry.ts` loads the generated data, runs **every flow through
`FlowSchema.parse` + `validateFlowReferences`** at module load, and assembles the
validated `Protocol[]`. A malformed flow throws with a located message rather
than rendering a broken page.

`scripts/validate-content.ts` is the CI surface of this: it loads the registry
and reports per-flow status, exiting non-zero on any problem. This is the gate
that catches structural mistakes in agent-authored content before review.

```
npm run check  ⇒  typecheck → test → validate-content → lint → build
```

## The flow engine (presentation, briefly)

The same `Flow` object drives every view, so all flows get the same UX for free:

- **`FlowViewer`** (client) — orchestrates active-step state, param toggles
  (e.g. PKCE on/off), keyboard nav, **auto-play**, and the Sequence⇄Topology
  toggle.
- **`SequenceDiagram`** — animated swim-lane: a token travels along the active
  message, actors carry role icons, and arrows are colored by **channel**
  (front-channel vs back-channel, inferred per step). Self-messages render as a
  loop.
- **`TopologyDiagram`** (opt-in, React Flow) — actors as nodes in a left-to-right
  role layout, with **floating, arced edges** so a message between non-adjacent
  actors routes *around* the ones in between rather than appearing to pass
  through them. Lazy-loaded so it costs nothing until opened.
- **`PayloadViewer`** — switches on `payload.kind`: `JwtViewer` (decodes the JWT
  client-side and annotates claims), `HttpViewer`, `XmlViewer`/`RawViewer`.

## Why this shape is "agent-friendly"

- **Constrained surface.** The agent writes to a known folder with a known
  template; the schema rejects anything off-contract with a precise error.
- **Self-checking.** `npm run check` gives the agent a deterministic pass/fail to
  iterate against before opening a PR.
- **No blast radius.** Because content can't reach engine code, a bad flow can
  fail its own page — it can't break the rest of the site.
- **Reviewable diffs.** A feature is a few data files, so both the accuracy agent
  and the human can reason about it quickly.

The full authoring contract lives in **`AGENTS.md`** at the repo root — the
"definition of done" the author agent follows and the reviewer enforces.
