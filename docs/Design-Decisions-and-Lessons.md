# Design Decisions & Lessons

The decisions that shaped the system, and — just as useful for a proof of
concept — the **real bugs hit on the way to production** and how each was fixed.
The bugs are the interesting part: they're the operational friction you only
discover by actually shipping agent work, not by demoing it.

## Key design decisions

### 1. A feature is data validated by a contract — not freehand code
The single most important choice. By making a flow a typed data file checked by a
Zod schema, the agent's task becomes *constrained and self-checking*, and a bad
flow can't reach engine code. This is what makes the work safe to delegate.
→ **[The Content Engine](The-Content-Engine.md)**

### 2. Two independent agents (author + reviewer)
Separation of concerns and a check on the author's own errors. The reviewer has a
different prompt, different tools (notably **WebFetch**), and is *adversarial* to
the author's output — grounded in the very specs the author was told to cite.

### 3. The accuracy reviewer is spec-grounded and advisory
- **Spec-grounded:** it fetches `specRefs` and may only raise a blocking-severity
  finding if it cites a section. This curbs the reviewer's *own* hallucination —
  the failure mode of a naive "is this right?" agent.
- **Advisory (doesn't block merge):** chosen deliberately. The human stays the
  decision-maker; the reviewer informs judgment rather than gatekeeping it. The
  verdict already carries severity, so promoting it to a required check later is a
  one-line change.

### 4. Least-privilege triggers on a public repo
Anyone may *request* work; only trusted users may *spawn* an agent. Both trigger
paths are gated on `author_association` (OWNER/MEMBER/COLLABORATOR). See the bug
in lesson #5 below — this gate exists because the obvious version was insecure.

### 5. Static export + Vercel, no server
The app pre-renders to static files. Nothing to operate, trivial to host, and the
"backend" is entirely build-time. Preview deploys per PR give the human a real
artifact to approve.

### 6. Opt-in topology view
The second (React Flow) diagram is per-flow opt-in (`topology: true`), default
off. The agent is instructed not to enable it unless asked — keeping the common
case simple and the bundle light (React Flow is lazy-loaded).

---

## Lessons learned (the production bugs)

### A. Vercel skipped the codegen → "module not found"
**Symptom:** first Vercel deploy failed — `Can't resolve '@/content/content.generated'`.
**Cause:** Vercel's Next.js preset runs `next build` *directly*, bypassing the npm
`prebuild` hook that generates the (git-ignored) registry files. CI passed because
CI runs `npm run build` (which fires `prebuild`).
**Fix:** `vercel.json` sets `"buildCommand": "npm run build"` so the codegen runs
everywhere.
**Lesson:** an agent's work can be green in CI and still fail in a *different*
build environment. Make the build command identical across CI and host.

### B. The issue form silently fell back to a blank editor
**Symptom:** the New Flow Request form rendered as a plain Title/Description box,
even via the direct template URL.
**Cause:** one field's description was an *unquoted* YAML scalar containing
`from → to: label` — a `: ` (colon-space) that YAML reads as a mapping separator.
That invalidated the whole form, and GitHub silently fell back.
**Fix:** quote the value.
**Lesson:** the request *surface* is part of the pipeline and needs the same rigor
as code. It had never been exercised because earlier issues were filed via the API
(`gh issue create`), which bypasses the form.

### C. The reviewer no-op'd on exactly the PRs we cared about
**Symptom:** on agent-authored PRs, the accuracy review posted "did not complete."
**Cause:** `claude-code-action` refuses to act on **bot-initiated** events by
default (a loop-prevention safety). The author agent opens PRs as the Claude
GitHub App (a bot), so the reviewer saw "non-human actor" and bailed.
**Fix:** `allowed_bots: "claude,claude[bot]"` on the reviewer step.
**Lesson:** when agents trigger other agents, default anti-bot protections will
(correctly) get in the way. You must *explicitly* opt specific bots in.

### D. The label trigger was exploitable
**Symptom (caught in design review):** the issue template auto-applies the
`new-flow` label, which fires `issues.labeled`. The first version trusted the
label alone — so on a public repo, *any* outsider filling the form could spawn an
agent run on our API credits.
**Fix:** gate the label path on `github.event.issue.author_association`.
**Lesson:** "applying a label requires write access" is false for *template*-
applied labels. Gate on the actor, never on the artifact.

### E. Dependency/runtime drift
- **Next.js 15.1.6 shipped with a critical CVE** → bumped to 15.5.x.
- **GitHub deprecated the Node 20 action runtime** → moved CI to
  `actions/checkout@v5` + `actions/setup-node@v5` on Node 22.
**Lesson:** routine supply-chain/runner upkeep is part of operating an agentic
repo; fold it into the same gated flow.

---

## What these lessons say about agentic delivery

The agent's *authoring* was rarely the hard part — the content it produced was
accurate and well-structured (the reviewer confirmed it against primary specs).
The friction was in the **plumbing around the agent**: build-environment parity,
the request surface, bot-to-bot permissions, and trigger authorization. That's the
real finding of this proof of concept: **to let agents ship to production, invest
in the gates, the triggers, and environment parity — the model does the writing,
but the harness earns the trust.**
