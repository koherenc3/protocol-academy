import type { Flow } from "@/lib/types";

/**
 * SPIFFE Workload SVID Issuance (X.509), as implemented by SPIRE.
 *
 * A workload obtains a cryptographic identity — an X.509-SVID whose URI SAN
 * encodes its SPIFFE ID — with NO pre-provisioned secret. Trust is bootstrapped
 * by two layers of attestation:
 *   1. Node attestation: the SPIRE Agent proves the node's identity to the
 *      SPIRE Server (here with a Kubernetes projected service-account token).
 *   2. Workload attestation: the Agent inspects the calling process to derive
 *      selectors and map them to a registered SPIFFE ID.
 * The workload then uses its SVID for mutual TLS against a peer service.
 *
 * All hops are server-to-server/local back-channel (no browser actor), so the
 * inferred channel ("direct") is correct and left unset.
 */
const flow: Flow = {
  id: "x509-svid-issuance",
  protocolId: "spiffe",
  title: "Workload SVID Issuance (X.509)",
  summary:
    "How a workload obtains a cryptographic identity (an X.509-SVID) with no pre-provisioned secret — via SPIRE node attestation and workload attestation — and uses it for mTLS.",
  specRefs: [
    { label: "SPIFFE Overview", url: "https://spiffe.io/docs/latest/spiffe-about/overview/" },
    { label: "SPIFFE-ID specification", url: "https://github.com/spiffe/spiffe/blob/main/standards/SPIFFE-ID.md" },
    { label: "X.509-SVID specification", url: "https://github.com/spiffe/spiffe/blob/main/standards/X509-SVID.md" },
    { label: "SPIRE concepts (attestation, Workload API)", url: "https://spiffe.io/docs/latest/spire-about/spire-concepts/" },
  ],
  topology: true,
  actors: [
    {
      id: "workload",
      label: "Workload",
      role: "client",
      description: "The process that needs an identity (e.g. the `web` service). It holds no secret.",
    },
    {
      id: "agent",
      label: "SPIRE Agent",
      role: "system",
      description: "Runs on each node. Attests the node to the Server and attests local workloads, exposing the Workload API over a Unix domain socket.",
    },
    {
      id: "server",
      label: "SPIRE Server",
      role: "authServer",
      description: "The trust domain's signing authority. Verifies attestations, holds registration entries, and signs SVIDs.",
    },
    {
      id: "peer",
      label: "Peer Service",
      role: "resourceServer",
      description: "Another SPIFFE-identified workload the Workload connects to over mTLS.",
    },
  ],
  steps: [
    {
      id: "node-attestation",
      from: "agent",
      to: "server",
      label: "AttestAgent (node attestation)",
      description:
        "On startup the SPIRE Agent proves the identity of the node it runs on. It calls the Server's Agent API (gRPC AttestAgent) presenting node attestation data — here a Kubernetes projected service-account token (a JWT bound to the node's pod and service account). No long-lived shared secret is configured on the node; the platform itself vouches for it.",
      payload: {
        kind: "jwt",
        token:
          "eyJhbGciOiJSUzI1NiIsImtpZCI6Ims4cy1zYS0yMDI2LTAxIiwidHlwIjoiSldUIn0.eyJhdWQiOlsic3BpcmUtc2VydmVyIl0sImV4cCI6MTc4MjAwMDAwMCwiaWF0IjoxNzgxOTk2NDAwLCJuYmYiOjE3ODE5OTY0MDAsImlzcyI6Imh0dHBzOi8va3ViZXJuZXRlcy5kZWZhdWx0LnN2Yy5jbHVzdGVyLmxvY2FsIiwia3ViZXJuZXRlcy5pbyI6eyJuYW1lc3BhY2UiOiJwcm9kIiwicG9kIjp7Im5hbWUiOiJ3ZWItN2Q5ZjhjNmI1NC0yeHFxcCIsInVpZCI6ImExYjJjM2Q0LTExMTEtMjIyMi0zMzMzLTQ0NDQ1NTU1NjY2NiJ9LCJzZXJ2aWNlYWNjb3VudCI6eyJuYW1lIjoid2ViIiwidWlkIjoiOTk4ODc3NjYtYWFhYS1iYmJiLWNjY2MtZGRkZGVlZWVmZmZmIn19LCJzdWIiOiJzeXN0ZW06c2VydmljZWFjY291bnQ6cHJvZDp3ZWIifQ.3aF9mK2pQ7rX1sV8tY0wZ4bN6cH5dJ8eL1gP3iR7uT",
        annotations: [
          { target: "aud", note: "The token is audience-bound to `spire-server`, so it cannot be replayed against the Kubernetes API or any other audience." },
          { target: "iss", note: "The cluster's token issuer. The Server's k8s_psat node attestor validates this signature against the cluster's public keys." },
          { target: "kubernetes.io", note: "Pod and service-account identity the Server uses to derive the agent's node selectors and its SPIFFE ID." },
          { target: "exp", note: "Projected tokens are short-lived and auto-rotated by the kubelet — there is no static credential to steal." },
        ],
      },
    },
    {
      id: "agent-svid-and-entries",
      from: "server",
      to: "agent",
      label: "Agent SVID + bundle + entries",
      direction: "back",
      description:
        "The Server verifies the attestation, assigns the agent its own SPIFFE ID, and returns: the agent's X.509-SVID, the trust bundle (the CA certs that anchor the trust domain), and the registration entries — the selector → SPIFFE ID mappings this agent is authorized to issue SVIDs for.",
      payload: {
        kind: "raw",
        label: "AttestAgentResponse (gRPC)",
        language: "json",
        content: `{
  "agent_svid": {
    "spiffe_id": "spiffe://example.org/spire/agent/k8s_psat/prod-cluster/abcdef",
    "cert_chain": ["MIIB...agent-leaf...", "MIIB...intermediate..."]
  },
  "trust_bundle": {
    "trust_domain": "example.org",
    "x509_authorities": ["MIIB...root-ca..."]
  },
  "authorized_entries": [
    {
      "entry_id": "5f8c1d2e-web",
      "spiffe_id": "spiffe://example.org/ns/prod/sa/web",
      "selectors": ["k8s:ns:prod", "k8s:sa:web", "unix:uid:1000"]
    }
  ]
}`,
        annotations: [
          { target: "trust_bundle", note: "The set of CA certificates that define the `example.org` trust domain. Every workload validates peer SVIDs against this bundle." },
          { target: "authorized_entries", note: "Pre-registered mappings. The agent will only mint an SVID for a workload whose attested selectors match one of these entries." },
          { target: "selectors", note: "All listed selectors must match the calling process for the entry to apply (AND semantics)." },
        ],
      },
    },
    {
      id: "workload-fetch",
      from: "workload",
      to: "agent",
      label: "FetchX509SVID (no secret)",
      description:
        "The workload calls the SPIFFE Workload API (gRPC over a Unix domain socket) and streams FetchX509SVID. Critically it presents NO token, password, or secret. Identity is derived from who the calling process IS — established next by workload attestation — not from anything the process can hold or leak.",
      payload: {
        kind: "raw",
        label: "Workload API call (unix:///run/spire/agent-sockets/api.sock)",
        language: "text",
        content: `rpc SpiffeWorkloadAPI.FetchX509SVID(X509SVIDRequest{}) returns (stream X509SVIDResponse)

# No Authorization header. No bearer token. No client secret.
# Authentication is the Unix socket peer credentials (PID/UID/GID) the
# kernel attaches to the connection — the workload cannot forge them.`,
        annotations: [
          { target: "No Authorization header", note: "The defining SPIFFE idea: a workload proves identity by what it is, not by a shared secret it must store and protect." },
          { target: "peer credentials", note: "SO_PEERCRED on the socket gives the agent the caller's PID. From the PID the agent inspects the process — the basis of workload attestation." },
        ],
      },
    },
    {
      id: "workload-attestation",
      from: "agent",
      to: "agent",
      label: "Workload attestation (selectors)",
      description:
        "The agent resolves the caller's PID (from the socket's peer credentials) and runs its workload attestor plugins against that process — reading kernel facts (unix:uid) and orchestrator facts (the pod and service account for k8s). These produce selectors, which the agent matches against its authorized registration entries to determine the workload's SPIFFE ID.",
      payload: {
        kind: "raw",
        label: "Derived selectors → matched entry",
        language: "text",
        content: `caller PID: 48213

derived selectors:
  unix:uid:1000
  unix:gid:1000
  k8s:ns:prod
  k8s:sa:web
  k8s:pod-name:web-7d9f8c6b54-2xqqp
  k8s:container-name:web

matched registration entry:
  spiffe_id: spiffe://example.org/ns/prod/sa/web
  required selectors: [k8s:ns:prod, k8s:sa:web, unix:uid:1000]  -> ALL satisfied`,
        annotations: [
          { target: "derived selectors", note: "Facts about the process the agent observed itself — not claims the workload asserted. The workload cannot lie about its own uid or pod." },
          { target: "ALL satisfied", note: "An entry matches only when every one of its selectors is present. A process missing any selector gets no SVID for that entry." },
        ],
      },
    },
    {
      id: "workload-csr",
      from: "agent",
      to: "server",
      label: "BatchNewX509SVID (CSR)",
      description:
        "The agent generates a fresh key pair for the workload and submits a CSR for the matched SPIFFE ID to the Server's SVID API. In practice the agent proactively syncs and rotates SVIDs for all of its authorized entries, so a fetching workload is usually served from cache; the request/sign path is shown here for clarity.",
      payload: {
        kind: "raw",
        label: "BatchNewX509SVIDRequest (gRPC)",
        language: "json",
        content: `{
  "params": [
    {
      "entry_id": "5f8c1d2e-web",
      "csr": "MIIBVjCB/QIBADAAMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcD...base64-DER-CSR...",
      "spiffe_id": "spiffe://example.org/ns/prod/sa/web"
    }
  ]
}`,
        annotations: [
          { target: "csr", note: "The private key is generated by the agent and never leaves the node. Only the public key (inside the CSR) is sent to be signed." },
          { target: "entry_id", note: "Ties the CSR to a pre-authorized entry, so the Server signs only identities this agent is permitted to issue." },
        ],
      },
    },
    {
      id: "server-signs-svid",
      from: "server",
      to: "agent",
      label: "Signed X.509-SVID",
      direction: "back",
      description:
        "The Server signs a short-lived leaf certificate whose single URI SAN is the workload's SPIFFE ID. This is the X.509-SVID: a standard X.509 cert that carries the SPIFFE ID in the URI SAN (not the CN), chaining to the trust domain's CA.",
      payload: {
        kind: "raw",
        label: "X.509-SVID leaf certificate",
        language: "text",
        content: `Certificate:
  Subject: O=example.org
  Issuer: O=example.org, CN=example.org Intermediate CA
  Validity:
    Not Before: 2026-06-26 12:00:00 UTC
    Not After : 2026-06-26 13:00:00 UTC      # 1-hour SVID, auto-rotated
  Subject Alternative Name:
    URI: spiffe://example.org/ns/prod/sa/web
  Key Usage: critical, Digital Signature, Key Encipherment
  Extended Key Usage: TLS Web Server Authentication, TLS Web Client Authentication
  Basic Constraints: critical, CA:FALSE`,
        annotations: [
          { target: "URI: spiffe://example.org/ns/prod/sa/web", note: "The SPIFFE ID lives in the URI SAN — the authoritative identity. Per the X.509-SVID spec there is exactly one URI SAN and the CN is not used for identity." },
          { target: "Not After", note: "SVIDs are deliberately short-lived (often ~1h). Continuous rotation removes the need for revocation in the common case." },
          { target: "CA:FALSE", note: "A leaf SVID must not be a CA — it can identify a workload but cannot sign other certificates." },
        ],
      },
    },
    {
      id: "deliver-to-workload",
      from: "agent",
      to: "workload",
      label: "X509SVIDResponse (cert + key + bundle)",
      direction: "back",
      description:
        "The agent returns, over the Workload API stream, the workload's X.509-SVID (certificate chain plus the private key it generated) and the trust bundle. Because this is a stream, the agent pushes a fresh SVID before the old one expires — the workload never has to manage rotation itself.",
      payload: {
        kind: "raw",
        label: "X509SVIDResponse (gRPC stream)",
        language: "json",
        content: `{
  "svids": [
    {
      "spiffe_id": "spiffe://example.org/ns/prod/sa/web",
      "x509_svid": "MIIB...leaf...||MIIB...intermediate...",
      "x509_svid_key": "MIGHAgEAMBMGByqGSM49...PKCS8-private-key...",
      "bundle": "MIIB...root-ca..."
    }
  ],
  "federated_bundles": {}
}`,
        annotations: [
          { target: "x509_svid_key", note: "The PKCS#8 private key, delivered only to the attested local workload over the Unix socket — it is never transmitted off the node." },
          { target: "bundle", note: "The trust domain CA bundle the workload uses to validate the SVIDs that peers present to it." },
        ],
      },
    },
    {
      id: "mtls-connect",
      from: "workload",
      to: "peer",
      label: "mTLS ClientHello + SVID",
      description:
        "The workload opens a mutually-authenticated TLS connection to the peer service, presenting its X.509-SVID as the client certificate. Both ends authenticate; neither trusts the network.",
      payload: {
        kind: "raw",
        label: "TLS handshake (client certificate)",
        language: "text",
        content: `ClientHello
  ...
Certificate (client)
  leaf: URI SAN = spiffe://example.org/ns/prod/sa/web
  chain anchored to example.org trust bundle
CertificateVerify
  signed with the SVID private key -> proves possession`,
        annotations: [
          { target: "Certificate (client)", note: "mTLS: the client also presents a certificate. The peer authenticates the workload, not just the reverse." },
          { target: "CertificateVerify", note: "Signing the handshake transcript with the SVID's private key proves the workload actually holds the key, not just a copy of the cert." },
        ],
      },
    },
    {
      id: "peer-authorizes",
      from: "peer",
      to: "workload",
      label: "Validate SVID + authorize",
      direction: "back",
      description:
        "The peer validates the presented SVID against its own copy of the trust bundle, extracts the SPIFFE ID from the URI SAN, and makes an authorization decision on that identity (e.g. allow `spiffe://example.org/ns/prod/sa/web`). It then completes the handshake, presenting its own SVID so the workload can authorize it in return.",
      payload: {
        kind: "raw",
        label: "Peer authorization decision",
        language: "text",
        content: `validate(client_svid, trust_bundle[example.org]) -> chain OK, not expired
peer SPIFFE ID = spiffe://example.org/ns/prod/sa/web

authorization policy:
  allow if peer_id == spiffe://example.org/ns/prod/sa/web   -> ALLOW

# Peer presents its own SVID (spiffe://example.org/ns/prod/sa/api)
# so the workload can authorize the server side too.`,
        annotations: [
          { target: "peer SPIFFE ID", note: "Authorization is on the cryptographic SPIFFE ID from the URI SAN — not an IP, hostname, or network location." },
          { target: "allow if", note: "SPIFFE provides identity; the application still enforces an explicit allow-list policy over those identities." },
        ],
      },
    },
  ],
};

export default flow;
