# The Agentic Pipeline

This is the heart of the proof of concept: a request in plain language becomes
reviewed, production-deployed software, with a human approving the *outcome*
rather than authoring it.

```
1. REQUEST            2. AUTHOR              3. PULL REQUEST       4. GATES (parallel)        5. APPROVE
┌──────────────┐      ┌──────────────┐       ┌──────────────┐      ┌────────────────────┐    ┌──────────┐
│ New Flow     │      │ Author agent │       │ Agent opens  │      │ • CI checks        │    │ Human    │
│ Request issue│ ───▶ │ (@claude)    │ ────▶ │ a PR:        │ ───▶ │ • Accuracy review  │──▶ │ clicks   │
│ + new-flow   │      │ reads issue, │       │ data + prose │      │   (reviewer agent) │    │ Merge    │
│ label        │      │ writes flow  │       │ "Closes #N"  │      │ • Vercel preview   │    └────┬─────┘
└──────────────┘      └──────────────┘       └──────────────┘      └────────────────────┘         │
                                                                                                   ▼
                                                                                          Production (Vercel)
```

## Stage 1 — The request

A contributor opens a **New Flow Request** issue
(`.github/ISSUE_TEMPLATE/new-flow.yml`) — a structured form: protocol, flow
title/id, actors, ordered steps, payloads, and **spec references**. Submitting it
auto-applies the `new-flow` label.

**Security gate (who can spawn work).** On a *public* repo anyone can open an
issue, so the trigger is gated on the actor's GitHub association, not on the label
alone:

```yaml
# .github/workflows/claude.yml
if: >
  (github.event_name == 'issues' &&
    github.event.label.name == 'new-flow' &&
    contains(fromJSON('["OWNER","MEMBER","COLLABORATOR"]'), github.event.issue.author_association)) ||
  (github.event_name != 'issues' &&
    contains(github.event.comment.body, '@claude') &&
    contains(fromJSON('["OWNER","MEMBER","COLLABORATOR"]'), github.event.comment.author_association))
```

Outsiders can *file* requests, but only the owner/members/collaborators can
*spawn an agent run*. A maintainer greenlights an outside request by commenting
`@claude …` on it (their comment is trusted). See **[Design Decisions &
Lessons](Design-Decisions-and-Lessons.md)** for why this matters.

## Stage 2 — The author agent

The labeled issue triggers `claude.yml`, which runs
`anthropics/claude-code-action`. The workflow injects the issue body into a
prompt that tells the agent to follow `AGENTS.md` exactly:

- Copy `content/_template/flow/` into `content/protocols/<p>/flows/<f>/`.
- Fill in `steps.ts` (typed actors/steps/payloads) and `content.mdx` (prose);
  add `meta.ts` if it's a new protocol.
- Use realistic-but-fake payloads; for JWTs, emit a genuinely decodable token.
- Run `npm install && npm run check` and fix until green.
- Open a PR that closes the issue.

Tool access is scoped via `claude_args` (`--allowedTools Edit,Write,Read,Glob,Grep,Bash --max-turns 40`).
Authentication is two-part: the **`ANTHROPIC_API_KEY`** secret (model calls) and
the **Claude GitHub App** (the OIDC→app-token exchange that lets the agent push a
branch and open the PR).

**Why the agent succeeds reliably:** it is never asked to design or modify the
engine. The work is a constrained, contract-validated data-authoring task. The
hard parts (rendering, routing, validation) are already solved by the engine.

## Stage 3 — The pull request

The agent commits to a branch and opens a PR ("Closes #N") summarizing what it
built. Crucially, the diff is **data + prose only** — typically two or three files
under `content/protocols/**`, zero engine changes. A reviewer (human or agent)
can reason about it quickly.

## Stage 4 — The gates (run in parallel on the PR)

Nothing reaches production without clearing all three:

**a) CI** (`ci.yml`) — the mechanical floor:
`typecheck → unit test → validate-content → lint → build`. `validate-content`
is the key one: it runs the new flow through the Zod contract, so a structurally
malformed flow fails here with a located error.

**b) Accuracy review** (`flow-review.yml`) — the **Security Architect** agent.
This is the fidelity layer that schema/lint/build can't provide:
- Triggers on any PR touching `content/protocols/**`.
- Reads the changed files, then **fetches each flow's `specRefs`** (the RFCs/specs)
  with WebFetch and checks the content against those **primary sources**.
- Flags fabricated parameters, wrong required/optional designations, incorrect
  security properties, mislabeled channels, and bad payloads.
- Writes a structured verdict (`flow-review.json`); a dependency-free formatter
  (`scripts/format-review.mjs`) renders it to a single **sticky PR comment**.
- **Advisory** — it never blocks merge (you decide). False-positive guard: a
  finding may be `critical`/`major` only if it cites a spec section, which curbs
  the reviewer's own hallucinations.

**c) Vercel preview** — every PR deploys to a live preview URL: the artifact the
human actually clicks through.

## Stage 5 — Human approval

The human reads the accuracy comment, opens the preview, and merges if satisfied.
**This is the only human authorship in the loop, and it's judgment, not typing.**
Merge to `main` → CI → Vercel production deploy.

## The two-agent design

| | Author agent (`claude.yml`) | Reviewer agent (`flow-review.yml`) |
|---|---|---|
| Trigger | `new-flow` label / `@claude` (trusted users) | PR touching `content/protocols/**` |
| Job | Implement the request | Fact-check it against specs |
| Tools | Edit/Write/Read/Glob/Grep/Bash | Read/Glob/Grep/**WebFetch**/Write |
| Output | A pull request | A verdict + PR comment |
| Blocks merge? | n/a | No (advisory) |

They're deliberately **independent** — different prompts, different tools,
different trigger. The reviewer is adversarial to the author's output, grounded
in sources the author was told to cite. That separation is what lets you trust
the result without reading every line yourself.

## Failure handling (honest about the edges)

- The reviewer step uses `continue-on-error: true`; if the agent errors, the
  formatter posts a "review did not complete" notice instead of failing the PR.
- Fork PRs from outsiders don't receive repo secrets, so they can't spend API
  credits — the reviewer simply can't run on them.
- Both agents are bounded by `--max-turns` to cap cost per run.

See **[Design Decisions & Lessons](Design-Decisions-and-Lessons.md)** for the real
bugs this pipeline hit on the way to production (and how each was fixed).
