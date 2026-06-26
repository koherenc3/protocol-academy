import type { Flow } from "@/lib/types";

/**
 * WebAuthn / FIDO2 — Passkey Ceremonies (Registration & Authentication).
 *
 * WebAuthn defines two ceremonies that share the same actors and shape:
 *   - Registration (attestation, §7.1): the authenticator mints a new
 *     public-key credential bound to the Relying Party's id, and returns an
 *     attestationObject the RP verifies and stores.
 *   - Authentication (assertion, §7.2): the authenticator signs a fresh
 *     server challenge with the previously-registered private key, proving
 *     possession without revealing the key or any shared secret.
 *
 * The "Authentication ceremony" param switches between them: OFF shows
 * Registration (excludes: ["authentication"]); ON shows Authentication
 * (requires: ["authentication"]).
 *
 * Three properties recur across both ceremonies and are annotated below:
 *   - the random challenge gives anti-replay,
 *   - the origin (in clientDataJSON) and the RP ID hash (in authenticatorData)
 *     bind the credential to one site, which is what makes passkeys
 *     phishing-resistant, and
 *   - the signature counter lets the RP detect cloned authenticators.
 *
 * The Browser/User are endpoints on most hops, so the inferred "front" channel
 * is correct and left unset.
 */
const flow: Flow = {
  id: "passkey-ceremonies",
  protocolId: "webauthn",
  title: "Passkey Ceremonies (Registration & Authentication)",
  summary:
    "Public-key login (passkeys): an authenticator creates a key pair bound to a site during the registration (attestation) ceremony, then proves possession of the private key during the authentication (assertion) ceremony — phishing-resistant, with no shared secret stored on the server.",
  specRefs: [
    { label: "W3C Web Authentication (WebAuthn) Level 2", url: "https://www.w3.org/TR/webauthn-2/" },
    {
      label: "WebAuthn §7.1 — Registering a new credential",
      url: "https://www.w3.org/TR/webauthn-2/#sctn-registering-a-new-credential",
    },
    {
      label: "WebAuthn §7.2 — Verifying an authentication assertion",
      url: "https://www.w3.org/TR/webauthn-2/#sctn-verifying-assertion",
    },
    {
      label: "FIDO CTAP 2.1 (client-to-authenticator protocol)",
      url: "https://fidoalliance.org/specs/fido-v2.1-ps-20210615/fido-client-to-authenticator-protocol-v2.1-ps-20210615.html",
    },
  ],
  actors: [
    {
      id: "user",
      label: "User",
      role: "user",
      description: "The human who performs the gesture (touch / biometric) that authorizes the authenticator.",
    },
    {
      id: "browser",
      label: "Browser (WebAuthn client)",
      role: "browser",
      description:
        "The user agent. Implements the WebAuthn API (navigator.credentials.create()/get()), assembles clientDataJSON, and enforces the origin.",
    },
    {
      id: "authenticator",
      label: "Authenticator",
      role: "system",
      description:
        "The platform or roaming authenticator (Touch ID, Windows Hello, a security key). Holds the private key, performs user verification, and signs.",
    },
    {
      id: "rp",
      label: "Relying Party Server",
      role: "authServer",
      description:
        "The site the user is logging in to. Issues challenges, verifies attestations/assertions, and stores each credential's public key, id and signature counter.",
    },
  ],
  params: [
    {
      id: "authentication",
      label: "Authentication ceremony",
      description:
        "OFF walks the registration (attestation) ceremony where a new passkey is created. ON walks the authentication (assertion) ceremony where an existing passkey proves possession of its private key.",
      defaultOn: false,
    },
  ],
  steps: [
    // ---- Registration (attestation) — toggle OFF --------------------------
    {
      id: "reg-begin",
      from: "user",
      to: "rp",
      label: "Begins registration",
      excludes: ["authentication"],
      description:
        "While signed in (or during sign-up), the user asks the Relying Party to add a passkey. The RP will respond with the creation options that drive navigator.credentials.create().",
    },
    {
      id: "reg-creation-options",
      from: "rp",
      to: "browser",
      label: "PublicKeyCredentialCreationOptions",
      direction: "back",
      excludes: ["authentication"],
      description:
        "The RP returns the options object for credential creation. It names the RP (rp.id/rp.name), the user account, the acceptable credential algorithms (pubKeyCredParams as COSE alg identifiers, e.g. -7 = ES256), an authenticatorSelection policy, and — critically — a fresh random challenge. excludeCredentials lists existing credentials so the same authenticator isn't enrolled twice.",
      payload: {
        kind: "raw",
        label: "PublicKeyCredentialCreationOptions (JSON view; challenge/user.id are ArrayBuffers in the API)",
        language: "json",
        content: `{
  "challenge": "lP9p2L0xQ3kZ8vN1rT7cYwB4dF6gH2jK5mP8sV0xZ4",
  "rp": { "id": "example.com", "name": "Example Corp" },
  "user": {
    "id": "QkY3OUYyM0EtMDAwMS00ZjBhLWIxMjMtYWNjb3VudA",
    "name": "alice@example.com",
    "displayName": "Alice Example"
  },
  "pubKeyCredParams": [
    { "type": "public-key", "alg": -7 },
    { "type": "public-key", "alg": -257 }
  ],
  "timeout": 60000,
  "attestation": "none",
  "authenticatorSelection": {
    "residentKey": "required",
    "userVerification": "required"
  },
  "excludeCredentials": [
    { "type": "public-key", "id": "x3Fk9pQ2rL7sV1tY8wZ0bN4cH6dJ5eK" }
  ]
}`,
        annotations: [
          {
            target: "challenge",
            note: "A fresh, cryptographically random value (base64url here; an ArrayBuffer in the API). The authenticator signs over it so a captured ceremony cannot be replayed — anti-replay.",
          },
          {
            target: "rp",
            note: "rp.id must be the origin's registrable domain (or a parent of it). It is the scope the credential is bound to; the browser refuses to create a credential for an rp.id the page is not within.",
          },
          {
            target: "pubKeyCredParams",
            note: "COSE algorithm identifiers in RP preference order: -7 is ES256 (ECDSA P-256), -257 is RS256. The authenticator picks the first it supports.",
          },
          {
            target: "user.id",
            note: "An opaque, non-PII account handle (≤64 bytes). It is returned later as userHandle during authentication — never the email or username.",
          },
        ],
      },
    },
    {
      id: "reg-create",
      from: "browser",
      to: "authenticator",
      label: "navigator.credentials.create()",
      excludes: ["authentication"],
      description:
        "The browser computes clientDataHash = SHA-256(clientDataJSON) — clientDataJSON binds the type \"webauthn.create\", the server challenge and the actual origin — and invokes the authenticator's authenticatorMakeCredential (CTAP2) with the RP id and that hash. The user performs the gesture (touch / biometric), which both proves presence and unlocks user verification.",
      payload: {
        kind: "raw",
        label: "clientDataJSON (browser-built; hashed into clientDataHash)",
        language: "json",
        content: `{
  "type": "webauthn.create",
  "challenge": "lP9p2L0xQ3kZ8vN1rT7cYwB4dF6gH2jK5mP8sV0xZ4",
  "origin": "https://example.com",
  "crossOrigin": false
}`,
        annotations: [
          {
            target: "type",
            note: "Must be exactly \"webauthn.create\" for registration. The RP rejects the ceremony if the type does not match — it prevents a create response being replayed as a get, and vice versa.",
          },
          {
            target: "origin",
            note: "The browser fills this in from the real page origin; script cannot forge it. The RP checks it equals its expected origin — the binding that makes passkeys phishing-resistant. A look-alike phishing site has a different origin and cannot produce a usable credential.",
          },
          {
            target: "challenge",
            note: "The same challenge the RP issued, echoed back inside the signed clientData so the RP can confirm freshness.",
          },
        ],
      },
    },
    {
      id: "reg-make-credential",
      from: "authenticator",
      to: "browser",
      label: "New credential (attestationObject)",
      direction: "back",
      excludes: ["authentication"],
      description:
        "The authenticator generates a new key pair scoped to rp.id, stores the private key, and returns the credential: a credentialId, the attestationObject (CBOR holding authenticatorData + the attestation statement attStmt) and clientDataJSON. authenticatorData embeds the attestedCredentialData (the new public key in COSE form, the AAGUID and the credentialId).",
      payload: {
        kind: "raw",
        label: "AuthenticatorAttestationResponse (attestationObject shown base64url, then CBOR-decoded)",
        language: "text",
        content: `credentialId (base64url): x3Fk9pQ2rL7sV1tY8wZ0bN4cH6dJ5eKa9F2g...

attestationObject (CBOR, base64url):
o2NmbXRkbm9uZWdhdHRTdG10oGhhdXRoRGF0YVjElP9p2L0x...AAAA...

attestationObject decoded:
{
  "fmt": "none",
  "attStmt": {},
  "authData": {
    "rpIdHash":  "a379a6f6eeafb9a55e378c118034e2751e682fab9f2d30ab13d2125586ce1947",
    "flags":     "0x45  (UP=1, UV=1, AT=1)",
    "signCount": 0,
    "attestedCredentialData": {
      "aaguid": "08987058-cadc-4b81-b6e1-30de50dcbe96",
      "credentialId": "x3Fk9pQ2rL7sV1tY8wZ0bN4cH6dJ5eKa9F2g...",
      "credentialPublicKey": {
        "kty": "EC2", "alg": -7, "crv": "P-256",
        "x": "f8a1c0...e3b2", "y": "9c2d4e...7a0b"
      }
    }
  }
}`,
        annotations: [
          {
            target: "fmt",
            note: "The attestation statement format. \"none\" matches the RP's attestation:\"none\" request — most consumer passkey flows don't need to verify authenticator provenance, so no attStmt is sent.",
          },
          {
            target: "rpIdHash",
            note: "SHA-256(rp.id). The RP recomputes SHA-256 of its own RP ID and compares — a second binding of the credential to this site, alongside the origin in clientData.",
          },
          {
            target: "flags",
            note: "Bit flags: UP = user present (gesture), UV = user verified (biometric/PIN), AT = attested credential data is included (set on registration).",
          },
          {
            target: "credentialPublicKey",
            note: "The COSE-encoded PUBLIC key the RP stores. The matching private key never leaves the authenticator — there is no shared secret on the server to breach.",
          },
        ],
      },
    },
    {
      id: "reg-post-attestation",
      from: "browser",
      to: "rp",
      label: "POST attestation",
      excludes: ["authentication"],
      description:
        "The browser serializes the PublicKeyCredential and POSTs it to the RP's registration endpoint: { id, rawId, response: { clientDataJSON, attestationObject }, type }. The binary fields are base64url-encoded for transport.",
      payload: {
        kind: "http",
        method: "POST",
        url: "https://example.com/webauthn/register/finish",
        headers: { "Content-Type": "application/json" },
        body: `{
  "id": "x3Fk9pQ2rL7sV1tY8wZ0bN4cH6dJ5eKa9F2g",
  "rawId": "x3Fk9pQ2rL7sV1tY8wZ0bN4cH6dJ5eKa9F2g",
  "type": "public-key",
  "response": {
    "clientDataJSON": "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoibFA5cDJMMHhRM2taOHZOMXJUN2NZd0I0ZEY2Z0gyaks1bVA4c1YweFo0Iiwib3JpZ2luIjoiaHR0cHM6Ly9leGFtcGxlLmNvbSIsImNyb3NzT3JpZ2luIjpmYWxzZX0",
    "attestationObject": "o2NmbXRkbm9uZWdhdHRTdG10oGhhdXRoRGF0YVjElP9p2L0x"
  }
}`,
        annotations: [
          {
            target: "clientDataJSON",
            note: "base64url of the exact JSON the authenticator signed over. The RP base64url-decodes it and re-checks type, challenge and origin against what it issued.",
          },
          {
            target: "attestationObject",
            note: "base64url CBOR. The RP decodes it to read authData (rpIdHash, flags, signCount) and the new public key, and to validate attStmt when attestation is requested.",
          },
        ],
      },
    },
    {
      id: "reg-verify-store",
      from: "rp",
      to: "browser",
      label: "Verify & store credential — done",
      direction: "back",
      excludes: ["authentication"],
      description:
        "The RP completes §7.1: decode clientDataJSON and confirm type === \"webauthn.create\", the challenge equals the one it issued, and the origin is expected; confirm rpIdHash === SHA-256(its RP ID); require flags UP (and UV if it demanded user verification); validate the attestation statement; ensure the credentialId is new. It then stores the credential public key, id, and the initial signCount, and the passkey is registered.",
      payload: {
        kind: "raw",
        label: "Stored credential record",
        language: "json",
        content: `{
  "userId": "QkY3OUYyM0EtMDAwMS00ZjBhLWIxMjMtYWNjb3VudA",
  "credentialId": "x3Fk9pQ2rL7sV1tY8wZ0bN4cH6dJ5eKa9F2g",
  "publicKey": { "kty": "EC2", "alg": -7, "crv": "P-256", "x": "f8a1c0...e3b2", "y": "9c2d4e...7a0b" },
  "signCount": 0,
  "transports": ["internal", "hybrid"],
  "aaguid": "08987058-cadc-4b81-b6e1-30de50dcbe96"
}`,
        annotations: [
          {
            target: "publicKey",
            note: "Only the public key is persisted. A database breach leaks nothing that lets an attacker authenticate, unlike a password (even hashed).",
          },
          {
            target: "signCount",
            note: "The baseline counter. Each later assertion must present a counter greater than this stored value (when the authenticator uses counters) — see clone detection in the authentication ceremony.",
          },
        ],
      },
    },

    // ---- Authentication (assertion) — toggle ON ---------------------------
    {
      id: "auth-begin",
      from: "user",
      to: "rp",
      label: "Begins login",
      requires: ["authentication"],
      description:
        "The user starts signing in (e.g. clicks \"Sign in with a passkey\"). The RP responds with the request options that drive navigator.credentials.get().",
    },
    {
      id: "auth-request-options",
      from: "rp",
      to: "browser",
      label: "PublicKeyCredentialRequestOptions",
      direction: "back",
      requires: ["authentication"],
      description:
        "The RP returns the assertion options: a fresh random challenge, the rpId, a userVerification policy, and allowCredentials — the credentialIds registered for this account (omitted/empty for usernameless discoverable-credential login). The browser will ask an authenticator that holds one of those credentials to sign.",
      payload: {
        kind: "raw",
        label: "PublicKeyCredentialRequestOptions (JSON view; challenge/id are ArrayBuffers in the API)",
        language: "json",
        content: `{
  "challenge": "Zr8kQw1nP3xV6tB9cY2dH5gJ7mL0sR4uX8zA1eC3fI",
  "rpId": "example.com",
  "timeout": 60000,
  "userVerification": "required",
  "allowCredentials": [
    { "type": "public-key", "id": "x3Fk9pQ2rL7sV1tY8wZ0bN4cH6dJ5eKa9F2g", "transports": ["internal", "hybrid"] }
  ]
}`,
        annotations: [
          {
            target: "challenge",
            note: "A new random challenge per login attempt. It is the nonce the authenticator signs, so a replayed signature from an old login is rejected — anti-replay.",
          },
          {
            target: "rpId",
            note: "The browser only invokes authenticators holding a credential scoped to this rpId, and the page's origin must be within it — phishing resistance starts here.",
          },
          {
            target: "allowCredentials",
            note: "Restricts which credentialIds may answer. An empty/omitted list enables usernameless login with discoverable credentials (resident keys), where the authenticator itself supplies the userHandle.",
          },
        ],
      },
    },
    {
      id: "auth-get",
      from: "browser",
      to: "authenticator",
      label: "navigator.credentials.get()",
      requires: ["authentication"],
      description:
        "The browser builds clientDataJSON with type \"webauthn.get\", the challenge and the origin, hashes it, and calls authenticatorGetAssertion (CTAP2) with the rpId, the clientDataHash and the allowed credentialIds. The user performs the gesture; the authenticator selects a matching credential and prepares to sign.",
      payload: {
        kind: "raw",
        label: "clientDataJSON (browser-built; hashed into clientDataHash)",
        language: "json",
        content: `{
  "type": "webauthn.get",
  "challenge": "Zr8kQw1nP3xV6tB9cY2dH5gJ7mL0sR4uX8zA1eC3fI",
  "origin": "https://example.com",
  "crossOrigin": false
}`,
        annotations: [
          {
            target: "type",
            note: "Must be exactly \"webauthn.get\" for authentication. A mismatch (e.g. a \"webauthn.create\" clientData) is rejected by the RP.",
          },
          {
            target: "origin",
            note: "Set by the browser from the true origin and signed over indirectly via clientDataHash. The RP verifies it — a phishing origin produces a clientData the RP will reject.",
          },
        ],
      },
    },
    {
      id: "auth-assertion",
      from: "authenticator",
      to: "browser",
      label: "Assertion (signature)",
      direction: "back",
      requires: ["authentication"],
      description:
        "The authenticator returns the assertion: authenticatorData (rpIdHash + flags + an incremented signCount), the clientDataJSON, the signature over authenticatorData ‖ SHA-256(clientDataJSON), and the userHandle (the user.id from registration, for discoverable credentials). Only the private key — never exported — can produce this signature.",
      payload: {
        kind: "raw",
        label: "AuthenticatorAssertionResponse",
        language: "text",
        content: `authenticatorData (base64url): lP9p2L0xQ3k...RQAAAAE

authenticatorData decoded:
  rpIdHash:  a379a6f6eeafb9a55e378c118034e2751e682fab9f2d30ab13d2125586ce1947
  flags:     0x05  (UP=1, UV=1, AT=0)
  signCount: 1

signature (ASN.1 DER ECDSA, base64url):
  MEUCIQCm9...assertion-signature-over(authData || SHA-256(clientDataJSON))...gQ

userHandle (base64url): QkY3OUYyM0EtMDAwMS00ZjBhLWIxMjMtYWNjb3VudA`,
        annotations: [
          {
            target: "signature",
            note: "ECDSA over authenticatorData ‖ SHA-256(clientDataJSON). The RP verifies it with the stored public key — possession of the private key is the proof of identity; no secret is transmitted.",
          },
          {
            target: "signCount",
            note: "Now 1 (was 0 at registration). The authenticator increments it on each use; the RP rejects a value not greater than the stored one, which surfaces a cloned authenticator replaying an old counter — clone detection.",
          },
          {
            target: "AT=0",
            note: "No attested credential data on assertions — unlike registration, no new public key is included; only proof of the existing one.",
          },
          {
            target: "userHandle",
            note: "The opaque account id chosen at registration (user.id), letting the RP locate the account in usernameless logins without the user typing a username.",
          },
        ],
      },
    },
    {
      id: "auth-post-assertion",
      from: "browser",
      to: "rp",
      label: "POST assertion",
      requires: ["authentication"],
      description:
        "The browser POSTs the assertion to the RP: { id, response: { clientDataJSON, authenticatorData, signature, userHandle }, type }. All binary members are base64url-encoded.",
      payload: {
        kind: "http",
        method: "POST",
        url: "https://example.com/webauthn/login/finish",
        headers: { "Content-Type": "application/json" },
        body: `{
  "id": "x3Fk9pQ2rL7sV1tY8wZ0bN4cH6dJ5eKa9F2g",
  "rawId": "x3Fk9pQ2rL7sV1tY8wZ0bN4cH6dJ5eKa9F2g",
  "type": "public-key",
  "response": {
    "clientDataJSON": "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiWnI4a1F3MW5QM3hWNnRCOWNZMmRINWdKN21MMHNSNHVYOHpBMWVDM2ZJIiwib3JpZ2luIjoiaHR0cHM6Ly9leGFtcGxlLmNvbSIsImNyb3NzT3JpZ2luIjpmYWxzZX0",
    "authenticatorData": "o3mp9u6vuaVeN4wRgDTidR5oL6ufLTCrE9ISVYbOGUcFAAAAAQ",
    "signature": "MEUCIQCm9assertionSignatureOverAuthDataAndClientDataHashgQ",
    "userHandle": "QkY3OUYyM0EtMDAwMS00ZjBhLWIxMjMtYWNjb3VudA"
  }
}`,
        annotations: [
          {
            target: "id",
            note: "The credentialId. The RP uses it (or userHandle) to look up the stored public key and counter for verification.",
          },
          {
            target: "signature",
            note: "base64url ECDSA signature the RP verifies against the stored public key over authenticatorData ‖ SHA-256(clientDataJSON).",
          },
        ],
      },
    },
    {
      id: "auth-verify",
      from: "rp",
      to: "browser",
      label: "Verify signature & counter — logged in",
      direction: "back",
      requires: ["authentication"],
      description:
        "The RP completes §7.2: look up the credential by id/userHandle; decode clientDataJSON and confirm type === \"webauthn.get\", challenge equals the issued one, and origin is expected; confirm authenticatorData.rpIdHash === SHA-256(its RP ID) and the UP (and UV if required) flags; verify the signature over authenticatorData ‖ SHA-256(clientDataJSON) with the stored public key; and confirm signCount is greater than the stored value, then persist the new count. On success the user is authenticated.",
      payload: {
        kind: "raw",
        label: "RP verification result",
        language: "text",
        content: `lookup credential by id -> found (user alice@example.com)
clientData.type      == "webauthn.get"                  OK
clientData.challenge == issued challenge                OK
clientData.origin    == "https://example.com"           OK
rpIdHash             == SHA-256("example.com")           OK
flags                 UP=1, UV=1                         OK
verify(signature, storedPublicKey,
       authData || SHA-256(clientDataJSON))              OK
signCount 1 > stored 0  -> accept, store newCount=1      OK

=> authentication successful; establish session`,
        annotations: [
          {
            target: "verify(signature",
            note: "The crux: a valid signature proves the authenticator still holds the private key bound to this account and origin — without ever sending a reusable secret.",
          },
          {
            target: "signCount 1 > stored 0",
            note: "Monotonic counter check. A counter that went backwards (or repeated) indicates a cloned authenticator; the RP can reject or flag the account.",
          },
          {
            target: "rpIdHash",
            note: "Re-derived from the RP's own RP ID and compared, re-binding the assertion to this site on the server side too.",
          },
        ],
      },
    },
  ],
};

export default flow;
