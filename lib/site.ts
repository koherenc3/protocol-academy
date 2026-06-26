/** Central site configuration referenced across layout, metadata, and links. */
export const SITE = {
  name: "IAM Protocol Academy",
  description:
    "Interactive, educational walkthroughs of IAM and security protocols — OAuth 2.0, OIDC, and more. Step through real flows, inputs, outputs, and payloads.",
  repoUrl: "https://github.com/koherenc3/protocol-academy",
  newFlowUrl:
    "https://github.com/koherenc3/protocol-academy/issues/new?template=new-flow.yml",
  // Production URL for absolute metadata (OG/canonical). Override with
  // NEXT_PUBLIC_SITE_URL (e.g. a custom domain); defaults to the Vercel URL.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://protocol-academy-iota.vercel.app",
} as const;
