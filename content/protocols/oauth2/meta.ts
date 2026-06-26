import type { ProtocolMeta } from "@/lib/types";

const meta: ProtocolMeta = {
  id: "oauth2",
  name: "OAuth 2.0",
  category: "Authorization",
  subtype: "Delegation",
  summary:
    "A delegation framework that lets a user grant a third-party app limited access to resources without sharing their password. The foundation OIDC builds on.",
  order: 1,
};

export default meta;
