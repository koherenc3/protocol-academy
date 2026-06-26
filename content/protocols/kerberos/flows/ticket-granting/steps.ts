import type { Flow } from "@/lib/types";

/**
 * Kerberos v5 — Ticket-Granting Authentication (AS / TGS / AP exchanges).
 *
 * The classic three-exchange Kerberos dance (RFC 4120 §3.1–3.3):
 *   1. AS exchange  — the client authenticates once to the Authentication
 *      Server (with pre-authentication) and receives a Ticket-Granting Ticket
 *      (TGT) plus a TGS session key.
 *   2. TGS exchange — the client presents the TGT to the Ticket-Granting Server
 *      to obtain a service ticket for a specific service principal.
 *   3. AP exchange  — the client presents the service ticket to the service to
 *      authenticate, optionally with mutual authentication.
 *
 * The teaching point is the key hierarchy: every ticket's encrypted part is
 * sealed with a secret key the CLIENT never possesses (the TGS's key, then the
 * service's key). The client only ever decrypts the session-key envelopes that
 * are sealed with keys it derived from the password. Tickets are opaque,
 * encrypted ASN.1 blobs to the client — modelled here with the `raw` payload
 * kind, annotated to show WHICH key seals each part.
 *
 * Every hop is a direct, server-to-server-style network message (there is no
 * browser/user-agent actor), so the inferred "direct" channel is correct and
 * left unset.
 */
const flow: Flow = {
  id: "ticket-granting",
  protocolId: "kerberos",
  title: "Ticket-Granting Authentication (AS / TGS / AP)",
  summary:
    "Symmetric-key SSO for networks: a client gets a Ticket-Granting Ticket from the KDC once, then exchanges it for per-service tickets — proving identity to services without resending the password.",
  specRefs: [
    {
      label: "RFC 4120 — The Kerberos Network Authentication Service (V5)",
      url: "https://datatracker.ietf.org/doc/html/rfc4120",
    },
    {
      label: "RFC 4120 §3 — AS/TGS/AP exchanges",
      url: "https://datatracker.ietf.org/doc/html/rfc4120#section-3",
    },
    {
      label: "RFC 6113 — A Generalized Framework for Kerberos Pre-Authentication",
      url: "https://datatracker.ietf.org/doc/html/rfc6113",
    },
  ],
  topology: true,
  actors: [
    {
      id: "client",
      label: "Client",
      role: "client",
      description:
        "Acts for the user principal (e.g. alice@EXAMPLE.COM). Holds only the long-term key derived from the user's password — never any KDC or service secret key.",
    },
    {
      id: "as",
      label: "KDC — Authentication Server (AS)",
      role: "authServer",
      description:
        "The first half of the Key Distribution Center. Knows every principal's long-term key. Authenticates the user once and issues the Ticket-Granting Ticket (TGT).",
    },
    {
      id: "tgs",
      label: "KDC — Ticket-Granting Server (TGS)",
      role: "authServer",
      description:
        "The second half of the KDC. Shares the krbtgt key (used to seal TGTs) and knows each service's long-term key. Issues per-service tickets in exchange for a valid TGT.",
    },
    {
      id: "service",
      label: "Service Server",
      role: "resourceServer",
      description:
        "The application the client wants to reach (e.g. HTTP/web.example.com). Shares a long-term secret key with the KDC and uses it to decrypt the service ticket — it never contacts the KDC during authentication.",
    },
  ],
  params: [
    {
      id: "mutual-auth",
      label: "Mutual authentication",
      description:
        "When ON, the service replies with an AP-REP (KRB_AP_REP), proving it could decrypt the ticket — so the client authenticates the service too. When OFF, the client authenticates to the service one-way.",
      defaultOn: true,
    },
  ],
  steps: [
    {
      id: "as-req",
      from: "client",
      to: "as",
      label: "AS-REQ",
      description:
        "The client asks the Authentication Server for a Ticket-Granting Ticket for the user principal. To prove it actually knows the password (and to defeat offline attacks on the reply), it includes pre-authentication: PA-ENC-TIMESTAMP — the current time encrypted with the client's long-term key, which is derived from the password by the string-to-key function. The AS rejects the request if it cannot decrypt this to a fresh timestamp.",
      payload: {
        kind: "raw",
        label: "KRB_AS_REQ (ASN.1, conceptual)",
        language: "text",
        content: `pvno     = 5
msg-type = 10                       # KRB_AS_REQ
padata:
  PA-ENC-TIMESTAMP (type 2):
    enc-part = ENC( K_client, { patimestamp = 2026-06-26T12:00:00Z,
                                pausec = 014217 } )
                                    # sealed with the client long-term key
                                    # K_client = string2key("…user password…")
req-body:
  kdc-options = (forwardable, renewable, proxiable)
  cname       = alice              # client principal (the user)
  realm       = EXAMPLE.COM
  sname       = krbtgt/EXAMPLE.COM # asking for a TGT
  till        = 2026-06-26T22:00:00Z
  nonce       = 1856372041
  etype       = [ aes256-cts-hmac-sha1-96 (18),
                  aes128-cts-hmac-sha1-96 (17) ]`,
        annotations: [
          {
            target: "PA-ENC-TIMESTAMP (type 2)",
            note: "Pre-authentication. Encrypting a fresh timestamp under the password-derived key proves knowledge of the password before the AS issues anything, and stops an attacker from harvesting an AS-REP to brute-force offline (RFC 6113).",
          },
          {
            target: "K_client = string2key",
            note: "The client's long-term key is derived from the password — it is NOT sent. The password itself never travels the network in any Kerberos message.",
          },
          {
            target: "sname       = krbtgt/EXAMPLE.COM",
            note: "The service being requested here is the TGS itself (principal krbtgt/REALM). The ticket you get back is therefore a Ticket-Granting Ticket.",
          },
          {
            target: "nonce       = 1856372041",
            note: "Echoed back inside the encrypted AS-REP so the client can confirm the reply is fresh and matches this request.",
          },
        ],
      },
    },
    {
      id: "as-rep",
      from: "as",
      to: "client",
      label: "AS-REP",
      direction: "back",
      description:
        "The AS verifies the pre-auth timestamp, then returns two things: the TGT — a ticket whose encrypted part is sealed with the TGS's secret key (the krbtgt key), so it is completely opaque to the client — and an enc-part sealed with the client's long-term key that carries the TGS session key. The client decrypts only the second envelope (it has the password-derived key) to learn the session key; it forwards the TGT untouched on the next exchange.",
      payload: {
        kind: "raw",
        label: "KRB_AS_REP (ASN.1, conceptual)",
        language: "text",
        content: `pvno     = 5
msg-type = 11                       # KRB_AS_REP
crealm   = EXAMPLE.COM
cname    = alice

ticket (the TGT):                   # OPAQUE to the client
  tkt-vno  = 5
  realm    = EXAMPLE.COM
  sname    = krbtgt/EXAMPLE.COM
  enc-part = ENC( K_tgs, {          # sealed with the TGS (krbtgt) key
                key       = SK_tgs,            # TGS session key
                crealm    = EXAMPLE.COM,
                cname     = alice,
                flags     = (forwardable, renewable),
                authtime  = 2026-06-26T12:00:01Z,
                endtime   = 2026-06-26T22:00:00Z } )

enc-part = ENC( K_client, {         # sealed with the CLIENT long-term key
              key      = SK_tgs,             # same TGS session key
              nonce    = 1856372041,
              sname    = krbtgt/EXAMPLE.COM,
              authtime = 2026-06-26T12:00:01Z,
              endtime  = 2026-06-26T22:00:00Z } )`,
        annotations: [
          {
            target: "enc-part = ENC( K_tgs,",
            note: "The TGT's contents are encrypted under K_tgs, the TGS's long-term (krbtgt) key. The client does NOT have this key, so the TGT is an opaque blob to it — only the KDC can read or alter it.",
          },
          {
            target: "enc-part = ENC( K_client,",
            note: "This second envelope is sealed with the client's password-derived key, so only the legitimate user can extract SK_tgs. It is the only part of the reply the client can decrypt.",
          },
          {
            target: "key       = SK_tgs",
            note: "The TGS session key appears in BOTH envelopes: inside the TGT (for the TGS to recover later) and inside the client's envelope (for the client now). This shared key bootstraps the next exchange.",
          },
          {
            target: "nonce    = 1856372041",
            note: "Matches the AS-REQ nonce, proving freshness and binding the reply to this specific request.",
          },
        ],
      },
    },
    {
      id: "tgs-req",
      from: "client",
      to: "tgs",
      label: "TGS-REQ",
      description:
        "Now holding a TGT and the TGS session key, the client asks the Ticket-Granting Server for a ticket to a specific service (the SPN). It presents the TGT unchanged inside an AP-REQ, plus a freshly built Authenticator encrypted with the TGS session key SK_tgs. The TGS decrypts the TGT with its own key to recover SK_tgs, then uses SK_tgs to decrypt the Authenticator — proving the requester really holds the session key from a valid TGT. No password is involved.",
      payload: {
        kind: "raw",
        label: "KRB_TGS_REQ (ASN.1, conceptual)",
        language: "text",
        content: `pvno     = 5
msg-type = 12                       # KRB_TGS_REQ
padata:
  PA-TGS-REQ (type 1) = AP-REQ {
    ticket = <the TGT from AS-REP, forwarded byte-for-byte>
    authenticator = ENC( SK_tgs, {  # sealed with the TGS session key
        crealm = EXAMPLE.COM,
        cname  = alice,
        cusec  = 552310,
        ctime  = 2026-06-26T12:00:05Z,
        cksum  = <checksum over req-body> } )
  }
req-body:
  kdc-options = (forwardable)
  realm       = EXAMPLE.COM
  sname       = HTTP/web.example.com   # the service principal (SPN)
  till        = 2026-06-26T22:00:00Z
  nonce       = 0099218744
  etype       = [ aes256-cts-hmac-sha1-96 (18) ]`,
        annotations: [
          {
            target: "ticket = <the TGT from AS-REP, forwarded byte-for-byte>",
            note: "The client cannot read or modify the TGT — it just relays it. The TGS decrypts it with K_tgs to recover SK_tgs and the verified client identity sealed inside.",
          },
          {
            target: "authenticator = ENC( SK_tgs,",
            note: "The Authenticator is sealed with the TGS session key, which only the holder of the matching TGT envelope can know. Decrypting it proves the requester is the principal the TGT names — without any password.",
          },
          {
            target: "ctime  = 2026-06-26T12:00:05Z",
            note: "A fresh timestamp inside the Authenticator. The TGS rejects timestamps outside its clock-skew window and remembers recently-seen ones, defeating replay of a captured Authenticator.",
          },
          {
            target: "sname       = HTTP/web.example.com",
            note: "The Service Principal Name being requested. The TGS will mint a ticket sealed with THIS service's long-term key.",
          },
        ],
      },
    },
    {
      id: "tgs-rep",
      from: "tgs",
      to: "client",
      label: "TGS-REP",
      direction: "back",
      description:
        "The TGS issues the service ticket. Its encrypted part is sealed with the target service's secret key, so — exactly like the TGT before it — it is opaque to the client. Alongside it, an enc-part sealed with the TGS session key SK_tgs carries the new service session key SK_svc. The client decrypts that envelope (it has SK_tgs) to learn SK_svc, and forwards the service ticket untouched to the service.",
      payload: {
        kind: "raw",
        label: "KRB_TGS_REP (ASN.1, conceptual)",
        language: "text",
        content: `pvno     = 5
msg-type = 13                       # KRB_TGS_REP
crealm   = EXAMPLE.COM
cname    = alice

ticket (the service ticket):        # OPAQUE to the client
  tkt-vno  = 5
  realm    = EXAMPLE.COM
  sname    = HTTP/web.example.com
  enc-part = ENC( K_service, {      # sealed with the SERVICE's secret key
                key      = SK_svc,            # service session key
                crealm   = EXAMPLE.COM,
                cname    = alice,
                flags    = (forwardable),
                authtime = 2026-06-26T12:00:01Z,
                endtime  = 2026-06-26T22:00:00Z } )

enc-part = ENC( SK_tgs, {           # sealed with the TGS session key
              key      = SK_svc,            # same service session key
              nonce    = 0099218744,
              sname    = HTTP/web.example.com,
              authtime = 2026-06-26T12:00:01Z,
              endtime  = 2026-06-26T22:00:00Z } )`,
        annotations: [
          {
            target: "enc-part = ENC( K_service,",
            note: "The service ticket is sealed with the target service's long-term key. The client has no such key — only the service (and the KDC) can decrypt it, so the client cannot read or forge its contents.",
          },
          {
            target: "enc-part = ENC( SK_tgs,",
            note: "This envelope is sealed with the TGS session key the client already learned in AS-REP. That is how the client recovers SK_svc here without ever using its password again — the essence of single sign-on.",
          },
          {
            target: "key      = SK_svc",
            note: "The service session key, placed both inside the service ticket (for the service to recover) and inside the SK_tgs envelope (for the client now). It will key the AP-REQ Authenticator next.",
          },
          {
            target: "nonce    = 0099218744",
            note: "Echoes the TGS-REQ nonce, binding this reply to that request and confirming freshness.",
          },
        ],
      },
    },
    {
      id: "ap-req",
      from: "client",
      to: "service",
      label: "AP-REQ",
      description:
        "The client finally authenticates to the service. It sends the service ticket (opaque, forwarded unchanged) plus a new Authenticator encrypted with the service session key SK_svc. The service decrypts the ticket with its own long-term key to recover SK_svc and the client's identity, then uses SK_svc to decrypt the Authenticator and check its timestamp — proving the caller genuinely holds the session key the KDC bound into the ticket. The service validates all of this offline, never contacting the KDC.",
      payload: {
        kind: "raw",
        label: "KRB_AP_REQ (ASN.1, conceptual)",
        language: "text",
        content: `pvno       = 5
msg-type   = 14                     # KRB_AP_REQ
ap-options = (MUTUAL-REQUIRED)      # ask the service to prove itself too
ticket = <the service ticket from TGS-REP, forwarded byte-for-byte>
authenticator = ENC( SK_svc, {      # sealed with the service session key
    crealm     = EXAMPLE.COM,
    cname      = alice,
    cusec      = 731904,
    ctime      = 2026-06-26T12:00:09Z,
    cksum      = <optional checksum over app data>,
    seq-number = 1481973355,
    subkey     = <optional per-session subkey> } )`,
        annotations: [
          {
            target: "ticket = <the service ticket from TGS-REP, forwarded byte-for-byte>",
            note: "The service decrypts this with K_service (its own long-term key) to recover SK_svc and the KDC-vouched client identity. The client could never have read or altered it.",
          },
          {
            target: "authenticator = ENC( SK_svc,",
            note: "Encrypting a fresh Authenticator under SK_svc proves the client actually possesses the session key bound inside the ticket — not just a copy of the ticket. Ticket + matching Authenticator together are what authenticate the client.",
          },
          {
            target: "ap-options = (MUTUAL-REQUIRED)",
            note: "Setting this flag requests mutual authentication: the client demands an AP-REP back so it can verify the service is genuine before trusting it.",
          },
          {
            target: "ctime      = 2026-06-26T12:00:09Z",
            note: "The service checks this timestamp against its clock-skew window and caches it to reject replays — the same anti-replay guard the TGS applied earlier.",
          },
        ],
      },
    },
    {
      id: "ap-rep",
      from: "service",
      to: "client",
      label: "AP-REP",
      direction: "back",
      description:
        "For mutual authentication, the service proves it could decrypt the ticket: it returns the timestamp from the client's Authenticator, re-encrypted with the service session key SK_svc. Only a service that holds its own long-term key could have recovered SK_svc from the ticket, so a correct AP-REP convinces the client the service is genuine — not an impostor. With mutual authentication off, this message is omitted and the client never verifies the service.",
      requires: ["mutual-auth"],
      payload: {
        kind: "raw",
        label: "KRB_AP_REP (ASN.1, conceptual)",
        language: "text",
        content: `pvno     = 5
msg-type = 15                       # KRB_AP_REP
enc-part = ENC( SK_svc, {           # sealed with the service session key
              ctime      = 2026-06-26T12:00:09Z,   # echoes the AP-REQ time
              cusec      = 731904,
              seq-number = 2712947668,
              subkey     = <optional negotiated subkey> } )`,
        annotations: [
          {
            target: "enc-part = ENC( SK_svc,",
            note: "The service can only produce this envelope if it recovered SK_svc, which requires decrypting the ticket with its own long-term key. That is precisely what proves the service is real to the client.",
          },
          {
            target: "ctime      = 2026-06-26T12:00:09Z",
            note: "Echoing back the exact timestamp from the client's Authenticator demonstrates the service decrypted that Authenticator — a value an impostor could not have read.",
          },
          {
            target: "subkey     = <optional negotiated subkey>",
            note: "The service may propose a fresh sub-session key here for the application session that follows, keeping later traffic off the longer-lived SK_svc.",
          },
        ],
      },
    },
  ],
};

export default flow;
