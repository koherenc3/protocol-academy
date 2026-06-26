import type { ProtocolMeta } from "@/lib/types";

const meta: ProtocolMeta = {
  id: "spiffe",
  name: "SPIFFE / SPIRE",
  category: "Workload Identity",
  subtype: "Attestation",
  summary:
    "A standard for giving running workloads cryptographic identities without pre-provisioned secrets. SPIFFE defines the identity (a SPIFFE ID and its SVID document); SPIRE is the reference implementation that attests workloads and issues short-lived X.509 or JWT SVIDs for zero-trust mTLS.",
  order: 3,
};

export default meta;
