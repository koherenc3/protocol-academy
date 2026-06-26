import type { ProtocolMeta } from "@/lib/types";

const meta: ProtocolMeta = {
  id: "webauthn",
  name: "WebAuthn / FIDO2",
  category: "Passwordless / FIDO2",
  summary:
    "The W3C Web Authentication API and its FIDO2 underpinnings. An authenticator creates an origin-bound public-key credential (a passkey) during a registration ceremony, then proves possession of the private key during an authentication ceremony — giving phishing-resistant login with no shared secret on the server to steal.",
  order: 4,
};

export default meta;
