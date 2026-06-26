import type { ProtocolMeta } from "@/lib/types";

const meta: ProtocolMeta = {
  id: "kerberos",
  name: "Kerberos v5",
  category: "Network Authentication",
  summary:
    "A symmetric-key single sign-on protocol for networks. A trusted Key Distribution Center (KDC) issues time-limited, encrypted tickets so clients can prove their identity to services without ever resending the password over the wire.",
  order: 4,
};

export default meta;
