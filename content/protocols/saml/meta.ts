import type { ProtocolMeta } from "@/lib/types";

const meta: ProtocolMeta = {
  id: "saml",
  name: "SAML 2.0",
  category: "Authentication",
  subtype: "Federation / SSO",
  summary:
    "Security Assertion Markup Language: an XML-based standard for browser single sign-on across security domains. A Service Provider delegates authentication to an Identity Provider, which returns a signed SAML assertion vouching for the user — the user's password never reaches the Service Provider.",
  order: 4,
};

export default meta;
