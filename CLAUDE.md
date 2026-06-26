# CLAUDE.md

This file points Claude Code (and other agents) at the project conventions.

**The authoritative guide for adding content is [AGENTS.md](./AGENTS.md). Read it
before adding or editing a protocol/flow.**

## Quick orientation

- **What this is:** a static, educational Next.js app teaching IAM/security
  protocols (OAuth 2.0, OIDC, …) via interactive flow walkthroughs.
- **Architecture:** a protocol *registry + flow engine*. Content is data
  (`content/protocols/**`), rendered by a generic engine (`components/`,
  `lib/`, `app/`). Adding a flow = adding data, not code.
- **Contract:** `lib/schema.ts` (Zod) is the single source of truth; types in
  `lib/types.ts` are derived from it.

## Commands

```bash
npm run dev               # local dev server
npm run check             # typecheck + validate-content + lint + build (the full gate)
npm run validate-content  # validate all flows against the schema
```

## Definition of done for any content PR

`npm run check` passes locally, and the Vercel preview renders the new page at
`/<protocol-id>/<flow-id>/`. See AGENTS.md for the full spec and the payload-kind
catalog.
