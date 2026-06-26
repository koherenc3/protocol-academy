import type { Flow } from "@/lib/types";

/**
 * OAuth 2.0 Authorization Code grant, with a PKCE toggle.
 *
 * The `pkce` param adds the code_challenge (on the authorization request) and
 * code_verifier (on the token request). Turn it off to see the classic
 * confidential-client variant that authenticates with a client_secret instead.
 */
const flow: Flow = {
  id: "auth-code-pkce",
  protocolId: "oauth2",
  title: "Authorization Code + PKCE",
  summary:
    "The recommended OAuth 2.0 flow for web and mobile apps: the app gets a short-lived authorization code via the browser, then exchanges it for tokens over a back channel. PKCE binds the code to the client that started the flow.",
  specRefs: [
    { label: "RFC 6749 §4.1 (Authorization Code)", url: "https://datatracker.ietf.org/doc/html/rfc6749#section-4.1" },
    { label: "RFC 7636 (PKCE)", url: "https://datatracker.ietf.org/doc/html/rfc7636" },
  ],
  topology: true,
  actors: [
    { id: "user", label: "User", role: "user", description: "The human logging in." },
    { id: "browser", label: "Browser", role: "browser", description: "The user-agent / front channel." },
    { id: "client", label: "Client App", role: "client", description: "The application requesting access." },
    { id: "auth-server", label: "Authorization Server", role: "authServer", description: "Issues codes and tokens." },
    { id: "api", label: "Resource Server", role: "resourceServer", description: "The API holding protected resources." },
  ],
  params: [
    {
      id: "pkce",
      label: "PKCE (S256)",
      description:
        "Proof Key for Code Exchange. Adds a code_challenge/code_verifier pair so a stolen authorization code can't be redeemed by an attacker.",
      defaultOn: true,
    },
  ],
  steps: [
    {
      id: "user-clicks-login",
      from: "user",
      to: "client",
      label: "Clicks “Log in”",
      description:
        "The user initiates login in the client app. With PKCE, the client now generates a random code_verifier and derives code_challenge = BASE64URL(SHA-256(code_verifier)).",
    },
    {
      id: "redirect-to-authorize-pkce",
      from: "client",
      to: "browser",
      label: "302 → /authorize (PKCE)",
      direction: "forward",
      requires: ["pkce"],
      description:
        "The client redirects the browser to the authorization endpoint. The request carries the public code_challenge (never the verifier) and a state value for CSRF protection.",
      payload: {
        kind: "http",
        method: "302",
        url: "https://auth.example.com/authorize",
        query: {
          response_type: "code",
          client_id: "s6BhdRkqt3",
          redirect_uri: "https://app.example.com/callback",
          scope: "read:profile read:files",
          state: "xyzABC123",
          code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
          code_challenge_method: "S512",
        },
        annotations: [
          { target: "code_challenge", note: "SHA-512 hash of the verifier; RFC 7636 mandates the S512 challenge method for PKCE." },
          { target: "state", note: "Opaque value echoed back later to detect CSRF / mismatched callbacks." },
          { target: "response_type=code", note: "Asks for an authorization code (not a token) — the defining feature of this grant." },
        ],
      },
    },
    {
      id: "redirect-to-authorize-plain",
      from: "client",
      to: "browser",
      label: "302 → /authorize",
      direction: "forward",
      excludes: ["pkce"],
      description:
        "Without PKCE, the redirect is the same minus the code_challenge. This is acceptable only for confidential clients that can keep a client_secret.",
      payload: {
        kind: "http",
        method: "302",
        url: "https://auth.example.com/authorize",
        query: {
          response_type: "code",
          client_id: "s6BhdRkqt3",
          redirect_uri: "https://app.example.com/callback",
          scope: "read:profile read:files",
          state: "xyzABC123",
        },
        annotations: [
          { target: "state", note: "Still required: CSRF protection does not depend on PKCE." },
        ],
      },
    },
    {
      id: "browser-get-authorize",
      from: "browser",
      to: "auth-server",
      label: "GET /authorize",
      description:
        "The browser follows the redirect, sending those same query parameters to the authorization server over the front channel.",
    },
    {
      id: "as-prompts-login",
      from: "auth-server",
      to: "user",
      label: "Login & consent screen",
      direction: "back",
      description:
        "The authorization server authenticates the user (if not already) and asks them to consent to the requested scopes.",
    },
    {
      id: "user-consents",
      from: "user",
      to: "auth-server",
      label: "Authenticates & approves",
      description:
        "The user proves their identity and approves the scopes. Authentication happens entirely at the authorization server — the client never sees the password.",
    },
    {
      id: "redirect-back-with-code",
      from: "auth-server",
      to: "browser",
      label: "302 → redirect_uri?code",
      direction: "back",
      description:
        "The authorization server redirects the browser back to the client's registered redirect_uri with a single-use authorization code and the original state.",
      payload: {
        kind: "http",
        method: "302",
        url: "https://app.example.com/callback",
        query: {
          code: "SplxlOBeZQQYbYS6WxSbIA",
          state: "xyzABC123",
        },
        annotations: [
          { target: "code", note: "Short-lived, single-use. Useless without the back-channel exchange (and the verifier, under PKCE)." },
          { target: "state", note: "The client MUST verify this matches the value it sent in step 2." },
        ],
      },
    },
    {
      id: "browser-delivers-code",
      from: "browser",
      to: "client",
      label: "GET /callback?code",
      description:
        "The browser hits the client's callback URL, delivering the code. The client first checks that state matches what it issued.",
    },
    {
      id: "token-request-pkce",
      from: "client",
      to: "auth-server",
      label: "POST /token (+verifier)",
      requires: ["pkce"],
      description:
        "Over a direct back-channel (no browser), the client exchanges the code for tokens. It includes the original code_verifier; the server re-hashes it and checks it equals the earlier code_challenge.",
      payload: {
        kind: "http",
        method: "POST",
        url: "https://auth.example.com/token",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "grant_type=authorization_code&code=SplxlOBeZQQYbYS6WxSbIA&redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback&client_id=s6BhdRkqt3&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
        annotations: [
          { target: "code_verifier", note: "The secret behind the earlier code_challenge. Proves this is the same client that started the flow." },
          { target: "grant_type=authorization_code", note: "Tells the token endpoint which grant is being redeemed." },
        ],
      },
    },
    {
      id: "token-request-secret",
      from: "client",
      to: "auth-server",
      label: "POST /token (+secret)",
      excludes: ["pkce"],
      description:
        "Without PKCE, a confidential client authenticates the token request with its client_secret instead. Public clients (SPAs, mobile) can't keep a secret — which is why PKCE is now the default.",
      payload: {
        kind: "http",
        method: "POST",
        url: "https://auth.example.com/token",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Basic czZCaGRSa3F0MzpnWDFmQmF0M2JW",
        },
        body: "grant_type=authorization_code&code=SplxlOBeZQQYbYS6WxSbIA&redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback",
        annotations: [
          { target: "Authorization: Basic", note: "client_id:client_secret, base64-encoded. Only safe where the secret can be protected." },
        ],
      },
    },
    {
      id: "token-response",
      from: "auth-server",
      to: "client",
      label: "Access token response",
      direction: "back",
      description:
        "The server returns an access token (often opaque in plain OAuth) plus its lifetime and granted scope, and usually a refresh token.",
      payload: {
        kind: "raw",
        label: "200 OK — application/json",
        language: "json",
        content: `{
  "access_token": "2YotnFZFEjr1zCsicMWpAA",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "tGzv3JOkF0XG5Qx2TlKWIA",
  "scope": "read:profile read:files"
}`,
        annotations: [
          { target: "access_token", note: "Sent to the API as a Bearer credential. In plain OAuth the client need not understand its contents." },
          { target: "refresh_token", note: "Used later to obtain new access tokens without sending the user back through login." },
        ],
      },
    },
    {
      id: "call-api",
      from: "client",
      to: "api",
      label: "GET /me (Bearer)",
      description:
        "The client calls the resource server, presenting the access token in the Authorization header.",
      payload: {
        kind: "http",
        method: "GET",
        url: "https://api.example.com/me",
        headers: { Authorization: "Bearer 2YotnFZFEjr1zCsicMWpAA" },
        annotations: [
          { target: "Authorization: Bearer", note: "Whoever holds the token can use it — protect it like a password and always use TLS." },
        ],
      },
    },
    {
      id: "api-responds",
      from: "api",
      to: "client",
      label: "200 Protected resource",
      direction: "back",
      description:
        "The resource server validates the token (introspection or local checks) and, if the scope allows, returns the protected data.",
      payload: {
        kind: "raw",
        label: "200 OK — application/json",
        language: "json",
        content: `{
  "sub": "248289761001",
  "name": "Jane Doe",
  "files": 42
}`,
      },
    },
  ],
};

export default flow;
