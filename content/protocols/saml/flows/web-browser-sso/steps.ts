import type { Flow } from "@/lib/types";

/**
 * SAML 2.0 Web Browser SSO Profile.
 *
 * A Service Provider (SP) delegates authentication to an Identity Provider
 * (IdP). The user's browser is the only channel between them: the SP sends an
 * <samlp:AuthnRequest> via the HTTP-Redirect binding, the IdP authenticates the
 * user locally, and returns a signed <samlp:Response> (carrying a signed
 * <saml:Assertion>) via the HTTP-POST binding. The user's credentials never
 * reach the SP.
 *
 * The `idp-initiated` param toggles between the two initiation modes:
 *  - OFF (default): SP-initiated. The flow starts at the SP, which mints an
 *    AuthnRequest; the IdP's Response carries InResponseTo binding it to that
 *    request.
 *  - ON: IdP-initiated. The user starts at the IdP portal; the IdP POSTs an
 *    *unsolicited* Response (no AuthnRequest, no InResponseTo) to the SP's ACS.
 */
const flow: Flow = {
  id: "web-browser-sso",
  protocolId: "saml",
  title: "Web Browser SSO (SP-initiated)",
  summary:
    "Browser-based single sign-on: a Service Provider redirects the user to an Identity Provider, which returns a signed SAML assertion that logs the user in — no password ever reaches the SP.",
  specRefs: [
    {
      label: "SAML 2.0 Core (assertions & protocols)",
      url: "https://docs.oasis-open.org/security/saml/v2.0/saml-core-2.0-os.pdf",
    },
    {
      label: "SAML 2.0 Profiles (Web Browser SSO)",
      url: "https://docs.oasis-open.org/security/saml/v2.0/saml-profiles-2.0-os.pdf",
    },
    {
      label: "SAML 2.0 Bindings (HTTP-Redirect / HTTP-POST)",
      url: "https://docs.oasis-open.org/security/saml/v2.0/saml-bindings-2.0-os.pdf",
    },
    {
      label: "SAML 2.0 Technical Overview",
      url: "https://www.oasis-open.org/committees/download.php/27819/sstc-saml-tech-overview-2.0-cd-02.pdf",
    },
  ],
  topology: true,
  actors: [
    {
      id: "user",
      label: "User",
      role: "user",
      description: "The human signing in. Their credentials are only ever entered at the IdP.",
    },
    {
      id: "browser",
      label: "Browser",
      role: "browser",
      description:
        "The user-agent / front channel. Every SAML message between the SP and IdP travels through it (HTTP-Redirect and HTTP-POST bindings).",
    },
    {
      id: "sp",
      label: "Service Provider (SP)",
      role: "client",
      description:
        "The application the user wants to use (the relying party). It consumes SAML assertions but never sees the user's password.",
    },
    {
      id: "idp",
      label: "Identity Provider (IdP)",
      role: "authServer",
      description:
        "The authority that authenticates the user and issues signed SAML assertions vouching for their identity.",
    },
  ],
  params: [
    {
      id: "idp-initiated",
      label: "IdP-initiated",
      description:
        "When ON, the user starts at the IdP portal and the IdP POSTs an unsolicited SAMLResponse to the SP's ACS — skipping the SP's AuthnRequest. When OFF (default), the flow is SP-initiated and the Response is bound to the request via InResponseTo.",
      defaultOn: false,
    },
  ],
  steps: [
    {
      id: "request-resource",
      from: "user",
      to: "sp",
      label: "GET /reports (protected)",
      excludes: ["idp-initiated"],
      description:
        "The user tries to open a protected resource at the SP. The SP has no local session for them yet, so it must establish who they are before serving the page.",
      payload: {
        kind: "http",
        method: "GET",
        url: "https://sp.example.com/reports",
        annotations: [
          {
            target: "/reports",
            note: "The originally-requested URL. The SP remembers it (as RelayState) so it can return the user here after login.",
          },
        ],
      },
    },
    {
      id: "redirect-to-idp",
      from: "sp",
      to: "browser",
      label: "302 → IdP SSO (SAMLRequest)",
      direction: "back",
      excludes: ["idp-initiated"],
      description:
        "Instead of prompting for a password itself, the SP redirects the browser to the IdP's SSO endpoint using the HTTP-Redirect binding. The <samlp:AuthnRequest> is DEFLATE-compressed, base64-encoded, then URL-encoded into the SAMLRequest query parameter. RelayState carries the SP's opaque pointer back to the originally-requested resource.",
      payload: {
        kind: "http",
        method: "302",
        url: "https://idp.example.org/sso",
        query: {
          SAMLRequest:
            "fZJBa9swFMf%2FivHdsSXHThyaQEgYC3RbWLIddhmy%2FJyK2pInyXTpp59sd6OFsZN47%2F%2F%2BvPf0tBHQqo5tO3vRX%2FBHj8YGz61qDBsT6yj3hkkQ0jANLRpmBTtuPz6wbJawzmhrhVZxsBXG0BroLEoQ5IkXFyVecXTC7msZc1lWQ%2BAaQ0ZlMaCtutg6STeKbXY",
          RelayState: "L3JlcG9ydHM",
        },
        annotations: [
          {
            target: "SAMLRequest",
            note: "The <samlp:AuthnRequest>, DEFLATE-compressed + base64 + URL-encoded (HTTP-Redirect binding). Decoded on the next hop.",
          },
          {
            target: "RelayState",
            note: "Opaque to the IdP — it echoes it back unchanged so the SP can resume at the originally-requested resource. Keep it short (≤80 bytes per the binding) and never put trusted data in it.",
          },
        ],
      },
    },
    {
      id: "get-sso-endpoint",
      from: "browser",
      to: "idp",
      label: "GET /sso (decoded AuthnRequest)",
      excludes: ["idp-initiated"],
      description:
        "The browser follows the redirect to the IdP. Here is the DECODED <samlp:AuthnRequest> the SP sent. It names who is asking (Issuer), where the answer should be POSTed (AssertionConsumerServiceURL), and a unique ID + IssueInstant the IdP will echo back so the SP can correlate the response.",
      payload: {
        kind: "xml",
        xml: `<samlp:AuthnRequest
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="_8f3a2b1c9d4e5f60718293a4b5c6d7e8"
    Version="2.0"
    IssueInstant="2026-06-26T12:00:00Z"
    Destination="https://idp.example.org/sso"
    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
    AssertionConsumerServiceURL="https://sp.example.com/saml/acs">
  <saml:Issuer>https://sp.example.com/saml/metadata</saml:Issuer>
  <samlp:NameIDPolicy
      Format="urn:oasis:names:tc:SAML:2.0:nameid-format:persistent"
      AllowCreate="true"/>
</samlp:AuthnRequest>`,
        annotations: [
          {
            target: "ID",
            note: "A unique request identifier. The IdP copies it into the Response's InResponseTo so the SP can prove the answer matches a request it actually sent.",
          },
          {
            target: "AssertionConsumerServiceURL",
            note: "Where the IdP must POST the response. The IdP should validate this against the SP's registered metadata — never blindly trust the URL in the request.",
          },
          {
            target: "Issuer",
            note: "The SP's entityID. The IdP uses it to look up the SP's metadata (its ACS URLs and audience).",
          },
        ],
      },
    },
    {
      id: "idp-portal",
      from: "user",
      to: "idp",
      label: "Opens app from IdP portal",
      requires: ["idp-initiated"],
      description:
        "In IdP-initiated SSO there is no AuthnRequest. The user is already at the IdP's portal and clicks the SP's application tile. The IdP will build an *unsolicited* response for that SP directly.",
      payload: {
        kind: "http",
        method: "GET",
        url: "https://idp.example.org/portal/apps/sp-reports",
        annotations: [
          {
            target: "/portal/apps/sp-reports",
            note: "The IdP already knows which SP this tile maps to, so it can target the SP's ACS without ever receiving a SAMLRequest.",
          },
        ],
      },
    },
    {
      id: "login-form",
      from: "idp",
      to: "user",
      label: "Login form",
      direction: "back",
      description:
        "If the user has no existing session at the IdP, it presents a login form. If they already have an IdP session (the basis of single sign-on), this step and the next are skipped and the IdP issues an assertion immediately.",
    },
    {
      id: "authenticate",
      from: "user",
      to: "idp",
      label: "Submits credentials",
      description:
        "The user authenticates directly to the IdP — password, MFA, passkey, whatever the IdP enforces. Critically, these credentials are entered at the IdP and never pass through the SP. That isolation is the whole point of federated SSO.",
    },
    {
      id: "post-response-sp-initiated",
      from: "idp",
      to: "browser",
      label: "Auto-POST form (signed SAMLResponse)",
      direction: "back",
      excludes: ["idp-initiated"],
      description:
        "The IdP returns a small HTML page with a self-submitting form (HTTP-POST binding) whose hidden SAMLResponse field is a base64-encoded <samlp:Response>. Below is the DECODED response — the centerpiece. It wraps a signed <saml:Assertion>: who the user is (Subject/NameID), who the assertion is for and for how long (Conditions), how they authenticated (AuthnStatement), profile attributes (AttributeStatement), and an enveloped XML signature (ds:Signature) proving it came from the IdP and was not tampered with. Because this is SP-initiated, InResponseTo ties it back to the AuthnRequest.",
      payload: {
        kind: "xml",
        xml: `<samlp:Response
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="_d1f2e3c4b5a697887766554433221100"
    Version="2.0"
    IssueInstant="2026-06-26T12:00:05Z"
    Destination="https://sp.example.com/saml/acs"
    InResponseTo="_8f3a2b1c9d4e5f60718293a4b5c6d7e8">
  <saml:Issuer>https://idp.example.org/saml/metadata</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion
      ID="_a9b8c7d6e5f40312233445566778899a"
      Version="2.0"
      IssueInstant="2026-06-26T12:00:05Z">
    <saml:Issuer>https://idp.example.org/saml/metadata</saml:Issuer>
    <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
      <ds:SignedInfo>
        <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
        <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
        <ds:Reference URI="#_a9b8c7d6e5f40312233445566778899a">
          <ds:Transforms>
            <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
            <ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
          </ds:Transforms>
          <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
          <ds:DigestValue>k2N8f1pQ7r9sV0tY3wZ4bN6cH5dJ8eL1gP3iR7uT2A=</ds:DigestValue>
        </ds:Reference>
      </ds:SignedInfo>
      <ds:SignatureValue>RXhhbXBsZVNpZ25hdHVyZU9ubHlOb3RBUmVhbEtleVZhbHVlMDEyMzQ1Njc4OWFiY2RlZg==</ds:SignatureValue>
      <ds:KeyInfo>
        <ds:X509Data>
          <ds:X509Certificate>MIIDpDCCAoygAwIBAgIJANfakeIdPSigningCertExampleOnlyNotARealCertificate0123456789</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </ds:Signature>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:2.0:nameid-format:persistent">a8f5f167f44f4964e6c998dee827110c</saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData
            NotOnOrAfter="2026-06-26T12:05:05Z"
            Recipient="https://sp.example.com/saml/acs"
            InResponseTo="_8f3a2b1c9d4e5f60718293a4b5c6d7e8"/>
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions
        NotBefore="2026-06-26T11:59:35Z"
        NotOnOrAfter="2026-06-26T12:05:05Z">
      <saml:AudienceRestriction>
        <saml:Audience>https://sp.example.com/saml/metadata</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AuthnStatement
        AuthnInstant="2026-06-26T12:00:04Z"
        SessionIndex="_f0e1d2c3b4a5968778695a4b3c2d1e0f">
      <saml:AuthnContext>
        <saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef>
      </saml:AuthnContext>
    </saml:AuthnStatement>
    <saml:AttributeStatement>
      <saml:Attribute Name="email" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>jane.doe@example.com</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="displayName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>Jane Doe</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="memberOf" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>engineering</saml:AttributeValue>
        <saml:AttributeValue>report-readers</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`,
        annotations: [
          {
            target: "ds:Signature",
            note: "An enveloped XML-DSig signature over the Assertion. It proves the assertion originated at the IdP and was not altered in the browser. The SP MUST verify it against the IdP's certificate from metadata — an unsigned or wrongly-signed assertion must be rejected.",
          },
          {
            target: "AudienceRestriction",
            note: "This assertion is valid ONLY for this SP. The SP must confirm its own entityID appears in <Audience>; otherwise an assertion minted for a different SP could be replayed against it.",
          },
          {
            target: "NotBefore",
            note: "The assertion is invalid before this instant. Combined with NotOnOrAfter it bounds a short validity window — the SP must enforce both (allowing a little clock skew).",
          },
          {
            target: "NotOnOrAfter",
            note: "Hard expiry of the assertion. After this instant the SP must reject it, limiting the window in which a captured bearer assertion could be replayed.",
          },
          {
            target: "InResponseTo",
            note: "Echoes the AuthnRequest ID. The SP matches it against a request it actually sent — defeating injection of an unsolicited assertion in SP-initiated mode.",
          },
          {
            target: "NameID",
            note: "The user's identifier at this SP. A persistent, opaque, pairwise value here avoids exposing a correlatable global identifier across SPs.",
          },
        ],
      },
    },
    {
      id: "post-response-idp-initiated",
      from: "idp",
      to: "browser",
      label: "Auto-POST form (unsolicited SAMLResponse)",
      direction: "back",
      requires: ["idp-initiated"],
      description:
        "In IdP-initiated mode the IdP builds an UNSOLICITED <samlp:Response> — there was no AuthnRequest, so it carries NO InResponseTo (here, or in the SubjectConfirmationData). Everything else is identical: a signed <saml:Assertion> with Subject, Conditions, AuthnStatement and attributes. Note the trade-off: with no InResponseTo to correlate, the SP cannot tell a legitimately-initiated login from an injected one, which is the classic risk of this mode.",
      payload: {
        kind: "xml",
        xml: `<samlp:Response
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="_c4d5e6f70819a2b3c4d5e6f708192a3b"
    Version="2.0"
    IssueInstant="2026-06-26T12:00:05Z"
    Destination="https://sp.example.com/saml/acs">
  <saml:Issuer>https://idp.example.org/saml/metadata</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion
      ID="_b1c2d3e4f5061728394a5b6c7d8e9f00"
      Version="2.0"
      IssueInstant="2026-06-26T12:00:05Z">
    <saml:Issuer>https://idp.example.org/saml/metadata</saml:Issuer>
    <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
      <ds:SignedInfo>
        <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
        <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
        <ds:Reference URI="#_b1c2d3e4f5061728394a5b6c7d8e9f00">
          <ds:Transforms>
            <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
            <ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
          </ds:Transforms>
          <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
          <ds:DigestValue>Q9m1Z0p7R8sV3tY4wN6cH5dJ8eL1gP3iR7uT2k2N8f=</ds:DigestValue>
        </ds:Reference>
      </ds:SignedInfo>
      <ds:SignatureValue>VW5zb2xpY2l0ZWRFeGFtcGxlU2lnbmF0dXJlTm90QVJlYWxLZXkwMTIzNDU2Nzg5YWJj==</ds:SignatureValue>
      <ds:KeyInfo>
        <ds:X509Data>
          <ds:X509Certificate>MIIDpDCCAoygAwIBAgIJANfakeIdPSigningCertExampleOnlyNotARealCertificate0123456789</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </ds:Signature>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:2.0:nameid-format:persistent">a8f5f167f44f4964e6c998dee827110c</saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData
            NotOnOrAfter="2026-06-26T12:05:05Z"
            Recipient="https://sp.example.com/saml/acs"/>
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions
        NotBefore="2026-06-26T11:59:35Z"
        NotOnOrAfter="2026-06-26T12:05:05Z">
      <saml:AudienceRestriction>
        <saml:Audience>https://sp.example.com/saml/metadata</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AuthnStatement
        AuthnInstant="2026-06-26T12:00:04Z"
        SessionIndex="_0fa1b2c3d4e5f60718293a4b5c6d7e8f">
      <saml:AuthnContext>
        <saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef>
      </saml:AuthnContext>
    </saml:AuthnStatement>
    <saml:AttributeStatement>
      <saml:Attribute Name="email" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>jane.doe@example.com</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="displayName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>Jane Doe</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`,
        annotations: [
          {
            target: "Destination",
            note: "No InResponseTo here: this is an unsolicited assertion. The SP cannot correlate it to a request, so it must rely on signature, audience and timing checks alone — and is more exposed to login CSRF.",
          },
          {
            target: "ds:Signature",
            note: "Still mandatory: the SP verifies it against the IdP certificate from metadata exactly as in SP-initiated mode.",
          },
          {
            target: "AudienceRestriction",
            note: "Even unsolicited, the assertion is scoped to this one SP via <Audience>; the SP must confirm its entityID is present.",
          },
        ],
      },
    },
    {
      id: "post-to-acs",
      from: "browser",
      to: "sp",
      label: "POST /saml/acs (SAMLResponse)",
      description:
        "The browser auto-submits the form, POSTing the base64 SAMLResponse (and RelayState, if any) to the SP's Assertion Consumer Service. This is the HTTP-POST binding: the message rides in the form body, not the URL.",
      payload: {
        kind: "http",
        method: "POST",
        url: "https://sp.example.com/saml/acs",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "SAMLResponse=PHNhbWxwOlJlc3BvbnNlIHhtbG5zOnNhbWxwPSJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6cHJvdG9jb2wiIC4uLiBiYXNlNjQtZW5jb2RlZCBzaWduZWQgUmVzcG9uc2UgLi4uPC9zYW1scDpSZXNwb25zZT4%3D&RelayState=L3JlcG9ydHM",
        annotations: [
          {
            target: "SAMLResponse",
            note: "The base64-encoded <samlp:Response> from the previous step (here truncated). Unlike the HTTP-Redirect binding it is NOT DEFLATE-compressed for HTTP-POST.",
          },
          {
            target: "RelayState",
            note: "The same opaque value the SP set earlier (here pointing at /reports). The SP uses it to resume where the user started.",
          },
        ],
      },
    },
    {
      id: "validate-assertion",
      from: "sp",
      to: "sp",
      label: "Validate assertion",
      description:
        "Before trusting anything, the SP validates the response: verify the XML signature against the IdP's certificate from metadata; confirm the Issuer is the expected IdP; check the Conditions (NotBefore / NotOnOrAfter window and that its own entityID is in the AudienceRestriction); confirm SubjectConfirmation Recipient is its ACS URL and (SP-initiated) InResponseTo matches a request it sent. Only then does it accept the identity.",
      payload: {
        kind: "raw",
        label: "SP validation checklist",
        language: "text",
        content: `[✓] XML signature verifies against IdP metadata cert (rsa-sha256)
[✓] Issuer == https://idp.example.org/saml/metadata  (expected IdP)
[✓] StatusCode == ...:status:Success
[✓] Conditions: NotBefore <= now <= NotOnOrAfter   (± clock skew)
[✓] AudienceRestriction contains our entityID  https://sp.example.com/saml/metadata
[✓] SubjectConfirmationData.Recipient == our ACS  https://sp.example.com/saml/acs
[✓] InResponseTo matches an outstanding AuthnRequest   (SP-initiated only)
[✓] Assertion ID not seen before                       (replay protection)`,
        annotations: [
          {
            target: "XML signature verifies",
            note: "The keystone check. A SAML SP that does not verify the signature (or verifies the wrong element) accepts forged assertions — the root cause of many real-world SAML bypasses.",
          },
          {
            target: "Assertion ID not seen before",
            note: "Bearer assertions are replayable within their validity window; the SP caches consumed IDs until NotOnOrAfter to reject duplicates.",
          },
        ],
      },
    },
    {
      id: "establish-session",
      from: "sp",
      to: "browser",
      label: "302 → /reports (session set)",
      direction: "back",
      description:
        "Validation passed, so the SP creates its OWN local session (typically a session cookie) and redirects the browser to the originally-requested resource — recovered from RelayState. The SAML assertion's job is done; from here the SP's session cookie carries the login. The user reaches /reports without ever having given the SP a password.",
      payload: {
        kind: "http",
        method: "302",
        url: "https://sp.example.com/reports",
        headers: {
          "Set-Cookie": "sp_session=2f8b1d...; HttpOnly; Secure; SameSite=Lax",
        },
        annotations: [
          {
            target: "Set-Cookie",
            note: "The SP's own session, independent of the IdP. SAML authenticated the user once; this cookie carries the session afterwards (HttpOnly + Secure to protect it).",
          },
        ],
      },
    },
  ],
};

export default flow;
