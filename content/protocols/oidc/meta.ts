import type { ProtocolMeta } from "@/lib/types";

const meta: ProtocolMeta = {
  id: "oidc",
  name: "OpenID Connect (OIDC)",
  category: "Authentication",
  subtype: "Token-based",
  summary:
    "A thin identity layer on top of OAuth 2.0. Adds an ID token (a signed JWT) so the client learns *who* the user is, not just *what* it may access. The basis of modern 'Sign in with…' buttons.",
  order: 2,
};

export default meta;
