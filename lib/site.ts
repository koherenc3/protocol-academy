/** Central site configuration referenced across layout, metadata, and links. */
export const SITE = {
  name: "IAM Protocol Academy",
  description:
    "Interactive, educational walkthroughs of IAM and security protocols — OAuth 2.0, OIDC, and more. Step through real flows, inputs, outputs, and payloads.",
  repoUrl: "https://github.com/koherenc3/protocol-academy",
  newFlowUrl:
    "https://github.com/koherenc3/protocol-academy/issues/new?template=new-flow.yml",
  // Production URL for absolute metadata (OG). Set NEXT_PUBLIC_SITE_URL in
  // Vercel to your domain; falls back to localhost for local dev.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;
