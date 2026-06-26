# Operations & Extending

A practical runbook: what's required to operate the pipeline, how to add a flow,
and the knobs for cost and strictness.

## One-time setup

| Requirement | Where | Why |
|---|---|---|
| **Claude GitHub App** installed on the repo | https://github.com/apps/claude | The agents exchange an OIDC token for an app token to push branches / open PRs / comment |
| **`ANTHROPIC_API_KEY`** repo secret | Settings → Secrets and variables → Actions | Model calls for both agents |
| **Actions can create PRs** | Settings → Actions → General → Workflow permissions | Lets the author agent open PRs |
| **Vercel project** connected to the repo | vercel.com → Import | Production deploy from `main`, preview per PR |
| `NEXT_PUBLIC_SITE_URL` (optional) | Vercel env | Absolute OpenGraph/canonical URLs |

The API key alone is **not** enough — the GitHub App is what authorizes the
GitHub side. (Missing it produces: "Claude Code is not installed on this
repository.")

## How to add a flow (human or agent)

The canonical spec is **`AGENTS.md`** at the repo root. In short:

1. Copy `content/_template/flow/` to `content/protocols/<protocol>/flows/<flow>/`.
2. Fill in `steps.ts` (typed) and `content.mdx` (prose); add `meta.ts` if it's a
   new protocol.
3. Run the gate: `npm run check` (typecheck → test → validate-content → lint →
   build).
4. Open a PR. CI + the accuracy reviewer + a Vercel preview run automatically.

To have the **agent** do it: file a *New Flow Request* issue and (as a trusted
user) ensure it carries the `new-flow` label — or comment `@claude …` on any
issue. Provide **strong `specRefs`**: they're what the reviewer fetches to
fact-check the result.

### The flow contract (essentials)
- ids are lowercase-kebab-case; `protocolId` matches the parent folder.
- actors have a `role` ∈ `user|browser|client|authServer|resourceServer|system`
  (drives lane color/icon).
- steps reference declared actor ids; `channel` (`front`/`direct`) is inferred if
  omitted.
- payloads are one of `http | jwt | xml | raw`.
- `topology: true` is opt-in (off by default).

## The gates (what blocks what)

| Gate | Workflow | Blocks merge? |
|---|---|---|
| CI: typecheck, unit test, validate-content, lint, build | `ci.yml` | Yes, if branch protection requires it |
| Accuracy review (Security Architect agent) | `flow-review.yml` | **No — advisory** |
| Vercel preview deploy | Vercel | Surfaces a preview; gate via branch protection if desired |

**Recommended branch protection:** require the **CI** check (and optionally the
Vercel check) on `main`. The accuracy review is intentionally advisory; promote
it to required only if you want hard enforcement (the verdict JSON already carries
severity to support that).

## Cost & safety controls

- **`--max-turns`** bounds each agent run (author 40, reviewer 35).
- **Trigger gating** restricts who can spawn the author agent to trusted users;
  the reviewer can't run on fork PRs (no secrets) and is allow-listed only for the
  Claude bot.
- **Spend cap:** set a usage limit on the Anthropic API key itself as a backstop.
- **Path scoping:** the reviewer only runs on PRs touching `content/protocols/**`.

## Making the reviewer stricter (optional)

Today the reviewer posts a summary comment and never blocks. To enforce accuracy:
1. Have `scripts/format-review.mjs` (or a new gate step) exit non-zero when the
   verdict contains `critical`/`major` findings.
2. Add that job as a **required status check** in branch protection.
The structured `flow-review.json` already distinguishes severity, so this is a
small, localized change.

## Troubleshooting quick-reference

| Symptom | Likely cause | Fix |
|---|---|---|
| Vercel build: "module not found … *.generated" | `next build` ran without codegen | Ensure `vercel.json` build command is `npm run build` |
| Issue "form" shows only Title/Description | Invalid `new-flow.yml` (e.g. unquoted `: `) | Fix YAML; verify it parses |
| Accuracy review says "did not complete" on an agent PR | Bot-actor guard | `allowed_bots` includes the Claude bot |
| Agent run fails: "Claude Code is not installed" | GitHub App missing | Install the Claude GitHub App on the repo |
| Outsider triggered an agent | Trigger trusted the label, not the actor | Gate on `author_association` |
