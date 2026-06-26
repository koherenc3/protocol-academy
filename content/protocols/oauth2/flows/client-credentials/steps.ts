import type { Flow } from "@/lib/types";

/**
 * OAuth 2.0 Client Credentials grant (RFC 6749 §4.4).
 *
 * Machine-to-machine: there is no user and no browser. The client authenticates
 * as *itself* (client_id/client_secret) directly at the token endpoint, gets an
 * access token, and uses it to call a protected API. Every hop is a back channel
 * — note there is no front channel and no refresh_token for this grant.
 */
const flow: Flow = {
  id: "client-credentials",
  protocolId: "oauth2",
  title: "Client Credentials",
  summary:
    "Machine-to-machine authorization: with no user involved, the app authenticates as itself to obtain an access token, then calls a protected API with it. Used for service-to-service calls, daemons, and cron jobs.",
  specRefs: [
    {
      label: "RFC 6749 §4.4 (Client Credentials Grant)",
      url: "https://datatracker.ietf.org/doc/html/rfc6749#section-4.4",
    },
  ],
  actors: [
    {
      id: "client",
      label: "Client App",
      role: "client",
      description: "A backend service acting on its own behalf — no end user.",
    },
    {
      id: "auth-server",
      label: "Authorization Server",
      role: "authServer",
      description: "Authenticates the client and issues access tokens.",
    },
    {
      id: "resource-server",
      label: "Resource Server",
      role: "resourceServer",
      description: "The API holding the protected inventory data.",
    },
  ],
  steps: [
    {
      id: "token-request",
      from: "client",
      to: "auth-server",
      label: "POST /token",
      description:
        "The client requests a token directly from the token endpoint. There is no /authorize step and no browser: the client authenticates as itself with HTTP Basic (client_id:client_secret) and asks for the scopes it needs. grant_type=client_credentials is what selects this grant.",
      payload: {
        kind: "http",
        method: "POST",
        url: "https://auth.example.com/token",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Basic aW52ZW50b3J5LXN2Yy1wcm9kOjhmMmEtQ3Yza1JxN0xwMVp4OU53MFl0Ng==",
        },
        body: "grant_type=client_credentials&scope=inventory%3Aread",
        annotations: [
          {
            target: "Authorization: Basic",
            note: "base64(client_id:client_secret). The client proves it is itself — there is no user to authenticate in this grant.",
          },
          {
            target: "grant_type=client_credentials",
            note: "Selects the Client Credentials grant (RFC 6749 §4.4). No authorization code, no redirect, no user consent.",
          },
          {
            target: "scope=inventory:read",
            note: "Requests only the access this service needs. The server may grant fewer scopes than asked.",
          },
        ],
      },
    },
    {
      id: "token-response",
      from: "auth-server",
      to: "client",
      label: "200 Access token",
      direction: "back",
      description:
        "The authorization server verifies the client's credentials and returns a Bearer access token, its lifetime, and the granted scope. Per RFC 6749 §4.4.3, no refresh_token is issued for this grant — when the token expires the client simply requests a new one.",
      payload: {
        kind: "raw",
        label: "200 OK — application/json",
        language: "json",
        content: `{
  "access_token": "2YotnFZFEjr1zCsicMWpAA-K4nV2bR8nQ",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "inventory:read"
}`,
        annotations: [
          {
            target: "access_token",
            note: "Opaque Bearer credential the client presents to the API. Treat it like a password; always send it over TLS.",
          },
          {
            target: "expires_in",
            note: "Seconds until expiry. Because there is no refresh_token, the client re-runs the token request to get a fresh one.",
          },
          {
            target: "scope",
            note: "The scope actually granted. RFC 6749 §4.4.3 says the response MUST NOT include a refresh token.",
          },
        ],
      },
    },
    {
      id: "call-api",
      from: "client",
      to: "resource-server",
      label: "GET /api/inventory (Bearer)",
      description:
        "The client calls the resource server, presenting the access token in the Authorization header as a Bearer credential.",
      payload: {
        kind: "http",
        method: "GET",
        url: "https://api.example.com/api/inventory",
        headers: {
          Authorization: "Bearer 2YotnFZFEjr1zCsicMWpAA-K4nV2bR8nQ",
          Accept: "application/json",
        },
        annotations: [
          {
            target: "Authorization: Bearer",
            note: "Whoever holds the token can use it. The resource server validates it and checks the inventory:read scope before answering.",
          },
        ],
      },
    },
    {
      id: "api-responds",
      from: "resource-server",
      to: "client",
      label: "200 Protected data",
      direction: "back",
      description:
        "The resource server validates the token (signature/introspection) and confirms it carries the inventory:read scope, then returns the protected JSON.",
      payload: {
        kind: "raw",
        label: "200 OK — application/json",
        language: "json",
        content: `{
  "items": [
    { "sku": "WID-001", "name": "Widget", "on_hand": 142 },
    { "sku": "GZM-880", "name": "Gizmo", "on_hand": 17 }
  ],
  "warehouse": "us-east-1",
  "as_of": "2026-06-26T14:05:00Z"
}`,
        annotations: [
          {
            target: "on_hand",
            note: "Read-only inventory data exposed by the inventory:read scope — no user-specific data, because there is no user.",
          },
        ],
      },
    },
  ],
};

export default flow;
