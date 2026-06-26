import type { ProtocolMeta } from "@/lib/types";

/**
 * TEMPLATE protocol metadata. Only needed when adding a NEW protocol (not just a
 * new flow under an existing one). Copy to
 *   content/protocols/<protocol-id>/meta.ts
 */
const meta: ProtocolMeta = {
  id: "example-protocol", // = the folder name; lowercase-kebab-case
  name: "Example Protocol",
  category: "Authentication", // or "Authorization", "Federation", etc.
  summary: "One-sentence description shown on the landing card.",
  order: 99, // lower sorts first on the landing page
};

export default meta;
