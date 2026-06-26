import type { Flow } from "@/lib/types";

/**
 * OpenID Connect Authorization Code flow.
 *
 * Structurally identical to OAuth 2.0 Authorization Code, but `scope` includes
 * `openid`, a `nonce` is added, and the token response carries an id_token: a
 * signed JWT describing the authenticated user. PKCE is included (recommended)
 * and not toggled here to keep the focus on the identity layer.
 */
const flow: Flow = {
  id: "auth-code",
  protocolId: "oidc",
  title: "Authorization Code (with ID Token)",
  summary:
    "Authenticate a user and learn who they are. Same redirect/exchange shape as OAuth 2.0, plus the openid scope, a nonce, and an id_token JWT the client validates to establish identity.",
  specRefs: [
    { label: "OpenID Connect Core 1.0 §3.1", url: "https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth" },
    { label: "ID Token", url: "https://openid.net/specs/openid-connect-core-1_0.html#IDToken" },
  ],
  topology: true,
  actors: [
    { id: "user", label: "User", role: "user", description: "The person signing in." },
    { id: "browser", label: "Browser", role: "browser", description: "The user-agent / front channel." },
    { id: "client", label: "Relying Party", role: "client", description: "The OIDC client (your app)." },
    { id: "op", label: "OpenID Provider", role: "authServer", description: "The IdP: authenticates the user and issues tokens." },
  ],
  steps: [
    {
      id: "user-clicks-login",
      from: "user",
      to: "client",
      label: "Clicks “Sign in”",
      description:
        "The user starts sign-in. The relying party (RP) prepares a PKCE code_verifier/challenge and a random nonce that will bind the resulting ID token to this request.",
    },
    {
      id: "redirect-to-authorize",
      from: "client",
      to: "browser",
      label: "302 → /authorize (openid)",
      description:
        "The RP redirects to the OpenID Provider's authorization endpoint. The defining additions over plain OAuth are scope=openid and the nonce.",
      payload: {
        kind: "http",
        method: "302",
        url: "https://auth.example.com/authorize",
        query: {
          response_type: "code",
          client_id: "s6BhdRkqt3",
          redirect_uri: "https://app.example.com/callback",
          scope: "openid profile email",
          state: "xyzABC123",
          nonce: "n-0S6_WzA2Mj",
          code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
          code_challenge_method: "S256",
        },
        annotations: [
          { target: "scope=openid", note: "The trigger that turns an OAuth request into an OpenID Connect request. Without it, no id_token is issued." },
          { target: "nonce", note: "Echoed inside the id_token. The client checks it to prevent token replay." },
          { target: "profile email", note: "Additional scopes asking for standard claims (name, email, …)." },
        ],
      },
    },
    {
      id: "browser-get-authorize",
      from: "browser",
      to: "op",
      label: "GET /authorize",
      description:
        "The browser forwards the request to the OpenID Provider over the front channel.",
    },
    {
      id: "op-authenticates",
      from: "op",
      to: "user",
      label: "Authenticate & consent",
      direction: "back",
      description:
        "The provider authenticates the user (password, passkey, MFA, existing session…) and asks consent for the requested scopes.",
    },
    {
      id: "user-consents",
      from: "user",
      to: "op",
      label: "Approves",
      description:
        "The user authenticates and consents. As with OAuth, credentials stay at the provider.",
    },
    {
      id: "redirect-back-with-code",
      from: "op",
      to: "browser",
      label: "302 → redirect_uri?code",
      direction: "back",
      description:
        "The provider redirects back to the RP's callback with a single-use authorization code and the original state.",
      payload: {
        kind: "http",
        method: "302",
        url: "https://app.example.com/callback",
        query: { code: "SplxlOBeZQQYbYS6WxSbIA", state: "xyzABC123" },
        annotations: [
          { target: "code", note: "Still just a code — identity is delivered in the token response, not here." },
        ],
      },
    },
    {
      id: "browser-delivers-code",
      from: "browser",
      to: "client",
      label: "GET /callback?code",
      description:
        "The browser delivers the code to the RP, which verifies state matches.",
    },
    {
      id: "token-request",
      from: "client",
      to: "op",
      label: "POST /token (+verifier)",
      description:
        "Back-channel exchange of the code for tokens, including the PKCE code_verifier.",
      payload: {
        kind: "http",
        method: "POST",
        url: "https://auth.example.com/token",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "grant_type=authorization_code&code=SplxlOBeZQQYbYS6WxSbIA&redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback&client_id=s6BhdRkqt3&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
      },
    },
    {
      id: "token-response",
      from: "op",
      to: "client",
      label: "Tokens (incl. id_token)",
      direction: "back",
      description:
        "The token response now includes an id_token alongside the access token. The id_token is the OIDC addition: a signed JWT asserting the user's identity.",
      payload: {
        kind: "raw",
        label: "200 OK — application/json",
        language: "json",
        content: `{
  "access_token": "2YotnFZFEjr1zCsicMWpAA",
  "token_type": "Bearer",
  "expires_in": 3600,
  "id_token": "<see next step>",
  "scope": "openid profile email"
}`,
        annotations: [
          { target: "id_token", note: "A JWT. Unlike the access token, it is meant for the client to read and validate — it answers 'who is this user?'." },
          { target: "access_token", note: "Still opaque to the client; used to call the UserInfo endpoint or other APIs." },
        ],
      },
    },
    {
      id: "inspect-id-token",
      from: "client",
      to: "client",
      label: "Validate id_token",
      description:
        "The RP validates the id_token's signature (using the provider's published keys), then checks iss, aud, exp, and that nonce matches the value it sent. Only then does it trust the identity claims (sub, name, email).",
      payload: {
        kind: "jwt",
        token:
          "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InJzYS0yMDI0LTAxIn0.eyJpc3MiOiJodHRwczovL2F1dGguZXhhbXBsZS5jb20iLCJzdWIiOiIyNDgyODk3NjEwMDEiLCJhdWQiOiJzNkJoZFJrcXQzIiwiZXhwIjoxNzM1NjkzMjAwLCJpYXQiOjE3MzU2ODk2MDAsImF1dGhfdGltZSI6MTczNTY4OTU5MCwibm9uY2UiOiJuLTBTNl9XekEyTWoiLCJuYW1lIjoiSmFuZSBEb2UiLCJlbWFpbCI6ImphbmVAZXhhbXBsZS5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZX0.rN1tQ5Hk0Yk7c9mJ2pXqWb3vZ4F8dL6sT0aG1hC2iU",
        annotations: [
          { target: "iss", note: "Must equal the provider you trust. Reject tokens from any other issuer." },
          { target: "aud", note: "Must equal your client_id — the token was minted for you, not another app." },
          { target: "nonce", note: "Must equal the nonce from step 2. Stops an attacker replaying an old id_token." },
          { target: "exp", note: "Expiry. Reject expired tokens (allowing only small clock skew)." },
          { target: "sub", note: "The stable, unique identifier for this user at this provider — your primary key for the account." },
        ],
      },
    },
    {
      id: "userinfo",
      from: "client",
      to: "op",
      label: "GET /userinfo (optional)",
      description:
        "Optionally, the RP calls the UserInfo endpoint with the access token to fetch additional claims not packed into the id_token.",
      payload: {
        kind: "http",
        method: "GET",
        url: "https://auth.example.com/userinfo",
        headers: { Authorization: "Bearer 2YotnFZFEjr1zCsicMWpAA" },
      },
    },
    {
      id: "userinfo-response",
      from: "op",
      to: "client",
      label: "200 UserInfo claims",
      direction: "back",
      description:
        "The provider returns standard claims for the subject identified by the access token.",
      payload: {
        kind: "raw",
        label: "200 OK — application/json",
        language: "json",
        content: `{
  "sub": "248289761001",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "email_verified": true
}`,
        annotations: [
          { target: "sub", note: "Must match the sub in the id_token — confirms both tokens describe the same user." },
        ],
      },
    },
  ],
};

export default flow;
