# Protocol Academy — an agentic-coding proof of concept

> **The real subject of this repository is the pipeline, not the app.**
> It demonstrates an **autonomous, gated workflow in which a coding agent turns a
> plain-language request into reviewed software that ships to production** — with
> a human approving the result, not writing it. The *IAM Protocol Academy* (the
> educational web app the pipeline builds) is the payload: a concrete, non-trivial
> domain to prove the loop on.

## The thesis

Most "AI writes code" demos stop at a snippet in a chat window. The interesting
question is operational: **can an agent push *real, reviewed* work into production,
safely and repeatably?** This project answers yes, by wiring an agent into the
normal software-delivery machinery — GitHub Issues, Pull Requests, CI, a second
reviewing agent, preview deploys, and a human merge — so every change earns its
way to production through the same gates a human's change would.

```
 Plain-language request                Human approves the *result*
 (a GitHub Issue)                       (a one-click merge)
        │                                        ▲
        ▼                                        │
   ┌─────────┐    ┌─────────┐   ┌──────────────────────────┐   ┌────────────┐
   │ Author  │ ─▶ │   Pull  │ ─▶│ Gates (parallel)         │ ─▶│ Production │
   │ agent   │    │ Request │   │ • CI (typecheck/test/    │   │ (Vercel)   │
   │(@claude)│    │(data-   │   │   schema/lint/build)     │   └────────────┘
   └─────────┘    │ only)   │   │ • Accuracy reviewer agent│
                  └─────────┘   │ • Vercel preview deploy  │
                                └──────────────────────────┘
```

## What makes it work

1. **The work is shaped so an agent can do it reliably.** A new feature ("a
   protocol flow") is *pure data validated by a contract*, not freehand code. The
   agent fills in a typed data file + prose; it never touches the engine. See
   **[The Content Engine](The-Content-Engine.md)**.
2. **Two agents, different jobs.** An **author agent** implements the request; an
   independent **Security Architect reviewer agent** fact-checks the result
   against primary specifications before a human sees it. See
   **[The Agentic Pipeline](The-Agentic-Pipeline.md)**.
3. **Real gates, human-in-the-loop.** Nothing merges without passing mechanical
   CI *and* getting a preview a human can click through. The human's job is
   **approval and judgment**, not authorship.
4. **Least-privilege triggers.** On a public repo, anyone can *request* work, but
   only trusted users can *spawn* an agent. See **[Design Decisions &
   Lessons](Design-Decisions-and-Lessons.md)**.

## Proof it actually works (not just in theory)

- **An agent-authored feature is live in production.** The OAuth 2.0 *Client
  Credentials* flow was specified in an issue, built by the agent, gated, and
  merged — now serving at `/oauth2/client-credentials/`.
- **The reviewer catches real inaccuracies.** In a deliberate test, a planted
  falsehood ("PKCE requires an `S512` method") was flagged by the reviewer with
  citations to **RFC 7636 §6.2.2 and §4.2** — and it even noticed the internal
  contradiction with the flow's own labels.
- **It generalizes to brand-new domains.** A *SPIFFE/SPIRE* X.509-SVID flow — a
  protocol the engine had never seen — was authored by the agent and passed a
  spec-grounded accuracy review against the SPIFFE standards.

## Read next

| Page | What's in it |
|---|---|
| **[Architecture Overview](Architecture-Overview.md)** | The whole system at a glance: app, content engine, CI/CD, agent layer |
| **[The Agentic Pipeline](The-Agentic-Pipeline.md)** | The star: issue → author agent → PR → gates → reviewer agent → production |
| **[The Content Engine](The-Content-Engine.md)** | The "backend": Zod contract, auto-discovery codegen, the flow engine |
| **[Design Decisions & Lessons](Design-Decisions-and-Lessons.md)** | Why it's built this way, and the real bugs we hit getting it to production |
| **[Operations & Extending](Operations-and-Extending.md)** | Runbook: secrets, gates, costs, and how to add a flow |

---
_Live app: https://protocol-academy-iota.vercel.app · Repo: https://github.com/koherenc3/protocol-academy_
