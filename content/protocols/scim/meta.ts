import type { ProtocolMeta } from "@/lib/types";

const meta: ProtocolMeta = {
  id: "scim",
  name: "SCIM 2.0",
  category: "Authentication",
  subtype: "Provisioning",
  summary:
    "System for Cross-domain Identity Management: a REST+JSON standard for provisioning users and groups across domains. An identity source (the SCIM client — an IdP or HR system) pushes the joiner-mover-leaver lifecycle into an application (the SCIM service provider) through a fixed resource model exposed at /Users and /Groups, so accounts are created, updated, and deactivated automatically instead of by hand.",
  order: 7,
};

export default meta;
