# AGENTS.md — How to add a protocol or flow

This repo is designed so a coding agent can add a new protocol flow by writing
**data + prose only**, with **zero changes to the engine**. Follow this spec
exactly; CI enforces it.

## The model

- A **protocol** lives in `content/protocols/<protocol-id>/` and has a `meta.ts`.
- A **flow** lives in `content/protocols/<protocol-id>/flows/<flow-id>/` and has:
  - `steps.ts` — a typed `Flow` (default export). The data that drives the diagram.
  - `content.mdx` — the educational prose shown beneath the diagram.
- Everything is **auto-discovered** (`scripts/build-registry.ts`). There is **no
  central list to edit** — creating the folder is enough.

## Definition of done

A change is complete when ALL of these pass locally and in CI:

```bash
npm run registry          # regenerate the auto-discovered index (also runs via pre-hooks)
npm run validate-content  # Zod + reference validation of every flow
npm run typecheck         # tsc --noEmit
npm run lint              # eslint
npm run build             # next build (static export)
```

`npm run check` runs typecheck + validate-content + lint + build in sequence.

The Vercel **preview deployment** on the PR must also render the new flow page at
`/<protocol-id>/<flow-id>/`.

## Adding a flow to an EXISTING protocol

1. Copy `content/_template/flow/` to
   `content/protocols/<protocol-id>/flows/<flow-id>/`.
2. Edit `steps.ts`: set `id` (= folder name), `protocolId` (= parent protocol),
   `title`, `summary`, `actors`, optional `params`, and `steps`.
3. Write `content.mdx` following the template's section structure.
4. Run the **Definition of done** commands.

## Adding a NEW protocol

1. Create `content/protocols/<protocol-id>/meta.ts` (copy `content/_template/meta.ts`).
2. Add at least one flow as above under `flows/`.
3. Run the **Definition of done** commands.

## The `Flow` contract (authoritative: `lib/schema.ts`)

- **ids**: lowercase-kebab-case (`^[a-z0-9-]+$`).
- **`protocolId`** MUST equal the parent protocol folder / `meta.id`.
- **actors**: ≥2. Each `{ id, label, role, description? }`. `role` ∈
  `user | browser | client | authServer | resourceServer | system` (drives lane color).
- **steps**: ≥1. Each `{ id, from, to, label, description, direction?, channel?, payload?, requires?, excludes? }`.
  - `from`/`to` MUST be declared actor ids. `from === to` renders as a self-message (e.g. "validate token").
  - `direction`: `"forward"` (default, solid arrow) or `"back"` (dashed, for responses).
  - `channel`: `"front"` (via browser) or `"direct"` (back channel). **Omit it** — it is
    inferred (front when the browser/user is an endpoint) and the inference is correct
    for normal OAuth/OIDC-style flows. Only set it to override a wrong inference.
  - `requires`/`excludes`: arrays of **param ids**; control conditional visibility.
- **params** (optional): `{ id, label, description, defaultOn }` toggles.
- **topology** (optional, default **false**): set `topology: true` ONLY if the request
  explicitly asks for the spatial/architecture "Topology" view. Do **not** enable it by
  default — most flows ship with the Sequence view only.

### What every flow gets automatically (no work needed)

The animated **Sequence** diagram, channel inference + coloring, role icons, payload
viewers (JWT decode / HTTP / XML / raw), `specRefs` links, and param toggles all come
from the engine. You only author `steps.ts` + `content.mdx`. The **Topology** view is the
one feature that is opt-in (see `topology` above).

### Payload variants (discriminated union on `kind`)

| `kind`  | Shape | Use for |
|---------|-------|---------|
| `http`  | `{ method, url, query?, headers?, body?, annotations? }` | Requests & redirects. `method` ∈ GET/POST/PUT/DELETE/PATCH/302/303 |
| `jwt`   | `{ token, annotations? }` — `token` is real `header.payload.signature` base64url | ID tokens, signed assertions |
| `xml`   | `{ xml, annotations? }` | SAML assertions, WS-* (viewer is currently a basic stub) |
| `raw`   | `{ content, label?, language?, annotations? }` | JSON responses, opaque blobs, anything else |

`annotations: { target, note }[]` render as callouts beneath the payload — use them
to explain the security-critical fields.

## Content quality bar

- Payloads should be **realistic** (plausible field names/values) but obviously
  **fake** — never real secrets. For `jwt`, emit a genuinely base64url-decodable
  token so the live decoder works.
- Prose should explain *why*, call out validation steps, and name the spec/RFC.
- Add accurate `specRefs` linking the authoritative spec — they are not just
  citations for readers, they are what the accuracy reviewer fetches.

## Accuracy review (every content PR)

A **Security Architect** reviewer agent (`.github/workflows/flow-review.yml`)
runs on every PR touching `content/protocols/**`. It reads your changed files,
**fetches the `specRefs` you provided**, and checks the content against those
primary sources for factual errors, fabricated/misnamed parameters, wrong
required-vs-optional designations, incorrect security properties, mislabeled
channels, and bad payloads. It posts a single summary comment.

It is **advisory** (it does not block merge), but treat its findings seriously —
the whole point of this project is accurate teaching. To make its job possible
and reduce false positives:
- Every factual claim should be **traceable to a cited spec**. Don't assert
  protocol behavior you can't ground in `specRefs`.
- Get parameter names, JWT claims, and required/optional status exactly right.
- Label each step's `channel` correctly (front = via browser, direct = back
  channel).

## What NOT to touch

You should not need to edit `lib/`, `components/`, `app/`, or `scripts/` to add a
flow. If a flow needs a brand-new payload kind (e.g. a Kerberos ticket viewer),
that is an **engine change**: add the variant to `lib/schema.ts`, a viewer in
`components/payload/`, and a `case` in `components/payload/PayloadViewer.tsx`.
Flag this in the PR description.
