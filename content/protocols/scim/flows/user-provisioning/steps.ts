import type { Flow } from "@/lib/types";

/**
 * SCIM 2.0 — User Provisioning (joiner-mover-leaver lifecycle).
 *
 * SCIM is an *interface*, not a handshake: a REST API over JSON with a fixed
 * resource model (RFC 7643) and a fixed set of operations (RFC 7644). One side,
 * the **SCIM client** (an IdP / HR system — Okta, Microsoft Entra ID, Workday),
 * is the source of truth and *pushes* identity changes. The other side, the
 * **SCIM service provider** (a downstream SaaS app), exposes `/Users`, `/Groups`
 * and a few discovery endpoints, and persists the result in its own identity
 * store. RFC 7642 frames the same actors by data-flow direction: the enterprise
 * (ECS) pushes the lifecycle to the cloud service (CSP).
 *
 * This flow walks the whole lifecycle against one service provider:
 *   discover capabilities → create (joiner) → group membership → update (mover)
 *   → reconcile by filter → deactivate (leaver). The `hard-delete` param adds the
 *   contrasting DELETE path, off by default because deactivation (active=false)
 *   is the recommended, reversible way to off-board.
 *
 * Every request is a back-channel, server-to-server call authorized with an
 * OAuth bearer token over TLS (RFC 7644 §2), so the channel is `direct`
 * throughout — there is no browser or end user in the loop.
 */
const flow: Flow = {
  id: "user-provisioning",
  protocolId: "scim",
  title: "User Provisioning (joiner-mover-leaver)",
  summary:
    "How a SCIM client (an IdP or HR system) provisions identities into a SCIM service provider (a SaaS app): discover capabilities, then create, group, update, reconcile, and deactivate a user through the standard /Users and /Groups REST resources.",
  specRefs: [
    {
      label: "RFC 7644 — SCIM Protocol (operations, endpoints, PATCH)",
      url: "https://datatracker.ietf.org/doc/html/rfc7644",
    },
    {
      label: "RFC 7643 — SCIM Core Schema (User, Group, Enterprise extension)",
      url: "https://datatracker.ietf.org/doc/html/rfc7643",
    },
    {
      label: "RFC 7642 — SCIM Definitions, Overview, Concepts, and Requirements",
      url: "https://datatracker.ietf.org/doc/html/rfc7642",
    },
  ],
  actors: [
    {
      id: "client",
      label: "SCIM Client (IdP / HR)",
      role: "client",
      description:
        "The identity source of truth that issues SCIM requests — an IdP such as Okta or Microsoft Entra ID, or an HR system. RFC 7642 calls this the Enterprise Cloud Subscriber (ECS): it pushes the joiner-mover-leaver lifecycle outward.",
    },
    {
      id: "sp",
      label: "SCIM Service Provider (SaaS App)",
      role: "resourceServer",
      description:
        "The downstream application that exposes the SCIM REST API (/Users, /Groups, /ServiceProviderConfig, …). RFC 7642 calls this the Cloud Service Provider (CSP): it receives identity data and serves the resource representations.",
    },
    {
      id: "store",
      label: "App Identity Store",
      role: "system",
      description:
        "The service provider's own backing database. SCIM is just the interface in front of it: the SP validates and translates each request, then persists state here and assigns the canonical resource id.",
    },
  ],
  params: [
    {
      id: "hard-delete",
      label: "Hard delete (DELETE /Users/{id})",
      description:
        "When ON, show the destructive DELETE operation (RFC 7644 §3.6). When OFF (default), off-boarding stops at deactivation (active=false) — the recommended, reversible approach that preserves audit history and lets the user be re-enabled.",
      defaultOn: false,
    },
  ],
  steps: [
    {
      id: "discover-config",
      from: "client",
      to: "sp",
      label: "GET /ServiceProviderConfig",
      description:
        "Before pushing anything, the client discovers what this service provider supports. RFC 7644 §4 defines three read-only discovery endpoints — /ServiceProviderConfig, /ResourceTypes, and /Schemas — that let a client adapt at runtime instead of hard-coding assumptions (e.g. whether PATCH is supported, whether filtering works, and the max page size).",
      payload: {
        kind: "http",
        method: "GET",
        url: "https://api.acme-saas.example.com/scim/v2/ServiceProviderConfig",
        headers: {
          Authorization: "Bearer 7b9e0c3a-2f41-4d6b-9c8e-1a5f2d3e4b6c",
          Accept: "application/scim+json",
        },
        annotations: [
          {
            target: "Accept",
            note: "SCIM defines its own media type, application/scim+json (RFC 7644 §3.1). Requests and responses use it rather than plain application/json.",
          },
          {
            target: "Authorization",
            note: "SCIM does not define its own auth scheme; RFC 7644 §2 says to reuse HTTP authentication, and OAuth 2.0 bearer tokens over TLS are the norm. The token here is an opaque API credential, not part of SCIM itself.",
          },
        ],
      },
    },
    {
      id: "config-response",
      from: "sp",
      to: "client",
      label: "200 ServiceProviderConfig",
      direction: "back",
      description:
        "The service provider advertises its capabilities. The client reads patch.supported and filter.supported to decide whether it can send incremental PATCH updates and filter queries (used later in this flow) or must fall back to whole-resource PUT and client-side reconciliation.",
      payload: {
        kind: "raw",
        label: "200 OK · application/scim+json",
        language: "json",
        content: `{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig"],
  "documentationUri": "https://docs.acme-saas.example.com/scim",
  "patch":          { "supported": true },
  "bulk":           { "supported": true, "maxOperations": 1000, "maxPayloadSize": 1048576 },
  "filter":         { "supported": true, "maxResults": 200 },
  "changePassword": { "supported": false },
  "sort":           { "supported": true },
  "etag":           { "supported": true },
  "authenticationSchemes": [
    {
      "type": "oauthbearertoken",
      "name": "OAuth Bearer Token",
      "description": "Authentication via the OAuth Bearer Token Standard",
      "specUri": "https://www.rfc-editor.org/info/rfc6750"
    }
  ],
  "meta": { "resourceType": "ServiceProviderConfig", "location": "https://api.acme-saas.example.com/scim/v2/ServiceProviderConfig" }
}`,
        annotations: [
          {
            target: "\"patch\":          { \"supported\": true }",
            note: "Defined in RFC 7643 §5. If false, the client must replace whole resources with PUT (RFC 7644 §3.5.1) instead of sending the incremental PATCH operations used later in this flow.",
          },
          {
            target: "\"filter\":         { \"supported\": true, \"maxResults\": 200 }",
            note: "Filtering is OPTIONAL in SCIM (RFC 7644 §3.4.2). maxResults caps a page; clients must paginate with startIndex/count and never assume one response holds every resource.",
          },
        ],
      },
    },
    {
      id: "create-user",
      from: "client",
      to: "sp",
      label: "POST /Users  (joiner)",
      description:
        "A new hire appears in the source of truth, so the client creates the user. The body is a core User resource (RFC 7643 §4.1) plus the Enterprise User extension (§4.3). Note externalId: the client's own stable key for this person, which the SP stores but does not interpret — it is how the two systems correlate records without sharing a primary key.",
      payload: {
        kind: "http",
        method: "POST",
        url: "https://api.acme-saas.example.com/scim/v2/Users",
        headers: {
          Authorization: "Bearer 7b9e0c3a-2f41-4d6b-9c8e-1a5f2d3e4b6c",
          "Content-Type": "application/scim+json",
        },
        body: `{
  "schemas": [
    "urn:ietf:params:scim:schemas:core:2.0:User",
    "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"
  ],
  "externalId": "701984",
  "userName": "bjensen@example.com",
  "name": { "givenName": "Barbara", "familyName": "Jensen", "formatted": "Barbara Jensen" },
  "displayName": "Babs Jensen",
  "title": "Onboarding Specialist",
  "emails": [ { "value": "bjensen@example.com", "type": "work", "primary": true } ],
  "active": true,
  "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": {
    "employeeNumber": "701984",
    "department": "Tour Operations"
  }
}`,
        annotations: [
          {
            target: "\"schemas\": [",
            note: "Every SCIM resource MUST declare its schema URNs (RFC 7643 §3, §4.1). Including the enterprise URN signals that the top-level extension object is present and how to interpret it.",
          },
          {
            target: "\"externalId\": \"701984\"",
            note: "The client's identifier for the resource (RFC 7643 §3.1). The SP persists it untouched; the client uses it to map its own records to the SP-assigned id — there is no shared primary key.",
          },
          {
            target: "\"userName\": \"bjensen@example.com\"",
            note: "REQUIRED and unique within the SP (RFC 7643 §4.1.1). A collision is the classic 409 'uniqueness' error (RFC 7644 §3.3).",
          },
          {
            target: "\"active\": true",
            note: "Administrative status (RFC 7643 §4.1.1). Flipping this to false is how SCIM disables an account without deleting it — the leaver step below.",
          },
        ],
      },
    },
    {
      id: "validate-and-assign",
      from: "sp",
      to: "store",
      label: "validate schema · enforce uniqueness · INSERT",
      description:
        "The service provider does the real work behind the interface: it validates the body against the declared schemas, rejects unknown or read-only attributes, enforces userName uniqueness (returning 409 if it collides), then persists the record and mints the canonical id and meta. This translation between the SCIM resource model and the app's native store is the entire job of a SCIM implementation.",
    },
    {
      id: "created-response",
      from: "sp",
      to: "client",
      label: "201 Created (+ Location)",
      direction: "back",
      description:
        "On success the SP returns 201 with the full resource as stored, including the server-assigned id, a meta block, and a Location header (RFC 7644 §3.3). The client records the id ↔ externalId mapping; that id is the handle for every later update, group operation, and deactivation.",
      payload: {
        kind: "raw",
        label: "201 Created · Location: …/Users/2819c223-… · application/scim+json",
        language: "json",
        content: `{
  "schemas": [
    "urn:ietf:params:scim:schemas:core:2.0:User",
    "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"
  ],
  "id": "2819c223-7f76-453a-919d-413861904646",
  "externalId": "701984",
  "userName": "bjensen@example.com",
  "name": { "givenName": "Barbara", "familyName": "Jensen", "formatted": "Barbara Jensen" },
  "displayName": "Babs Jensen",
  "title": "Onboarding Specialist",
  "emails": [ { "value": "bjensen@example.com", "type": "work", "primary": true } ],
  "active": true,
  "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": {
    "employeeNumber": "701984",
    "department": "Tour Operations"
  },
  "meta": {
    "resourceType": "User",
    "created": "2026-06-28T09:14:02Z",
    "lastModified": "2026-06-28T09:14:02Z",
    "version": "W/\\"a330bc54f0671c9\\"",
    "location": "https://api.acme-saas.example.com/scim/v2/Users/2819c223-7f76-453a-919d-413861904646"
  }
}`,
        annotations: [
          {
            target: "\"id\": \"2819c223-7f76-453a-919d-413861904646\"",
            note: "The SP's canonical, immutable identifier (RFC 7643 §3.1). It is read-only and assigned by the server — the client never chooses it.",
          },
          {
            target: "\"location\"",
            note: "RFC 7644 §3.3 requires the SP to return the resource's canonical URL on create — as a Location response header and here in meta.location — so the client knows where to GET/PUT/PATCH/DELETE it next.",
          },
          {
            target: "\"version\"",
            note: "An entity-tag (ETag) version (RFC 7644 §3.14), also returned as an ETag header. The client can send it in If-Match on later writes to get optimistic concurrency and avoid clobbering a concurrent change.",
          },
        ],
      },
    },
    {
      id: "add-to-group",
      from: "client",
      to: "sp",
      label: "PATCH /Groups/{id}  add member",
      description:
        "The new user must join the 'Tour Guides' group. Rather than PUT the whole Group (and risk dropping members added concurrently), the client sends a PATCH that adds just this one member (RFC 7644 §3.5.2). The PatchOp body is a list of operations; 'add' to the multi-valued 'members' attribute appends without disturbing the rest.",
      payload: {
        kind: "http",
        method: "PATCH",
        url: "https://api.acme-saas.example.com/scim/v2/Groups/e9e30dba-f08f-4109-8486-d5c6a331660a",
        headers: {
          Authorization: "Bearer 7b9e0c3a-2f41-4d6b-9c8e-1a5f2d3e4b6c",
          "Content-Type": "application/scim+json",
        },
        body: `{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    {
      "op": "add",
      "path": "members",
      "value": [
        {
          "value": "2819c223-7f76-453a-919d-413861904646",
          "$ref": "https://api.acme-saas.example.com/scim/v2/Users/2819c223-7f76-453a-919d-413861904646",
          "display": "Babs Jensen"
        }
      ]
    }
  ]
}`,
        annotations: [
          {
            target: "\"urn:ietf:params:scim:api:messages:2.0:PatchOp\"",
            note: "The PATCH body is itself a SCIM message with its own schema URN (RFC 7644 §3.5.2) — not a JSON Merge Patch or JSON Patch document.",
          },
          {
            target: "\"op\": \"add\"",
            note: "One of add / remove / replace (RFC 7644 §3.5.2.1–§3.5.2.3). 'add' on a multi-valued attribute like members appends the value rather than overwriting the array.",
          },
          {
            target: "\"value\": \"2819c223-7f76-453a-919d-413861904646\"",
            note: "A group member references a user by its SP-assigned id (RFC 7643 §4.2). $ref is the resolvable URL of that user; display is a convenience label only.",
          },
        ],
      },
    },
    {
      id: "group-updated",
      from: "sp",
      to: "client",
      label: "200 OK (updated Group)",
      direction: "back",
      description:
        "The SP applies the operation and returns the updated Group (RFC 7644 §3.5.2). A server MAY instead return 204 No Content if the client did not ask for the representation back; returning the resource lets the client confirm the membership and pick up the new meta.version.",
      payload: {
        kind: "raw",
        label: "200 OK · application/scim+json",
        language: "json",
        content: `{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Group"],
  "id": "e9e30dba-f08f-4109-8486-d5c6a331660a",
  "displayName": "Tour Guides",
  "members": [
    {
      "value": "2819c223-7f76-453a-919d-413861904646",
      "$ref": "https://api.acme-saas.example.com/scim/v2/Users/2819c223-7f76-453a-919d-413861904646",
      "display": "Babs Jensen"
    }
  ],
  "meta": {
    "resourceType": "Group",
    "lastModified": "2026-06-28T09:14:05Z",
    "version": "W/\\"d72f8b1e4a09c33\\"",
    "location": "https://api.acme-saas.example.com/scim/v2/Groups/e9e30dba-f08f-4109-8486-d5c6a331660a"
  }
}`,
        annotations: [
          {
            target: "\"members\"",
            note: "A Group's membership is the authoritative side of the relationship (RFC 7643 §4.2). The matching User.groups attribute is read-only — the SP derives it, the client never writes it directly.",
          },
        ],
      },
    },
    {
      id: "update-user",
      from: "client",
      to: "sp",
      label: "PATCH /Users/{id}  (mover)",
      description:
        "The user changes role — a 'mover' event. The client sends only the changed attributes via PATCH 'replace'. Note the extension attribute is targeted by its fully-qualified URN path; core attributes like title are addressed by their bare name (RFC 7644 §3.5.2 / §3.10).",
      payload: {
        kind: "http",
        method: "PATCH",
        url: "https://api.acme-saas.example.com/scim/v2/Users/2819c223-7f76-453a-919d-413861904646",
        headers: {
          Authorization: "Bearer 7b9e0c3a-2f41-4d6b-9c8e-1a5f2d3e4b6c",
          "Content-Type": "application/scim+json",
          "If-Match": 'W/"a330bc54f0671c9"',
        },
        body: `{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    { "op": "replace", "path": "title", "value": "Senior Onboarding Specialist" },
    {
      "op": "replace",
      "path": "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:department",
      "value": "Customer Success"
    }
  ]
}`,
        annotations: [
          {
            target: "\"path\": \"urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:department\"",
            note: "Attributes from a schema extension are addressed by their full URN-qualified path (RFC 7644 §3.10). Core attributes such as title use the short name.",
          },
          {
            target: "\"If-Match\": \"W/\\\"a330bc54f0671c9\\\"\"",
            note: "Optimistic concurrency (RFC 7644 §3.14): the SP applies the change only if the resource still matches this version, returning 412 Precondition Failed otherwise — avoiding lost updates when two clients write at once.",
          },
        ],
      },
    },
    {
      id: "user-updated",
      from: "sp",
      to: "client",
      label: "204 No Content",
      direction: "back",
      description:
        "The SP applied the patch. Here it returns 204 No Content — permitted by RFC 7644 §3.5.2 when the client did not request the updated body back. The client trusts that the named attributes now hold the new values.",
      payload: {
        kind: "raw",
        label: "Response status",
        language: "http",
        content: `HTTP/1.1 204 No Content`,
        annotations: [
          {
            target: "204 No Content",
            note: "Saves bandwidth on bulk reconciliation runs. If the client needs the new state (e.g. the bumped meta.version), it re-reads with GET or asks for the body and gets 200 instead.",
          },
        ],
      },
    },
    {
      id: "query-users",
      from: "client",
      to: "sp",
      label: "GET /Users?filter=…",
      description:
        "During a periodic reconciliation the client confirms what the SP actually holds by querying with a filter instead of guessing ids (RFC 7644 §3.4.2). Filters use SCIM's expression language — here the 'eq' operator on userName. Filter values must be URL-encoded in the query string.",
      payload: {
        kind: "http",
        method: "GET",
        url: "https://api.acme-saas.example.com/scim/v2/Users",
        query: {
          filter: 'userName eq "bjensen@example.com"',
          attributes: "id,userName,active",
        },
        headers: {
          Authorization: "Bearer 7b9e0c3a-2f41-4d6b-9c8e-1a5f2d3e4b6c",
          Accept: "application/scim+json",
        },
        annotations: [
          {
            target: "filter",
            note: "SCIM filter grammar (RFC 7644 §3.4.2.2): operators include eq, ne, co (contains), sw (starts with), pr (present), and gt/ge/lt/le. String comparisons are case-insensitive by default.",
          },
          {
            target: "attributes",
            note: "Projection (RFC 7644 §3.4.2.5): asking for only id, userName, active keeps the response small. excludedAttributes does the inverse. Sensitive values like passwords are never returned regardless.",
          },
        ],
      },
    },
    {
      id: "list-response",
      from: "sp",
      to: "client",
      label: "200 ListResponse",
      direction: "back",
      description:
        "Queries return a ListResponse envelope (RFC 7644 §3.4.2), never a bare array. totalResults, startIndex and itemsPerPage drive pagination; the matched resources sit in the Resources array. Here exactly one user matched.",
      payload: {
        kind: "raw",
        label: "200 OK · application/scim+json",
        language: "json",
        content: `{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
  "totalResults": 1,
  "startIndex": 1,
  "itemsPerPage": 1,
  "Resources": [
    {
      "id": "2819c223-7f76-453a-919d-413861904646",
      "userName": "bjensen@example.com",
      "active": true
    }
  ]
}`,
        annotations: [
          {
            target: "\"schemas\": [\"urn:ietf:params:scim:api:messages:2.0:ListResponse\"]",
            note: "The query-result envelope schema (RFC 7644 §3.4.2). Wrapping results lets the SP report totalResults and pagination alongside the page of Resources.",
          },
          {
            target: "\"totalResults\": 1",
            note: "The total number of matches across all pages, not just this page — the client uses it with startIndex/itemsPerPage to know whether to request more pages.",
          },
        ],
      },
    },
    {
      id: "deactivate-user",
      from: "client",
      to: "sp",
      label: "PATCH /Users/{id}  active=false  (leaver)",
      excludes: ["hard-delete"],
      description:
        "The user leaves the company. The recommended off-boarding is a soft disable: PATCH 'replace' active=false (RFC 7643 §4.1.1). The account and its history survive, downstream sign-in is blocked, and the user can be re-enabled if they return — all without losing the id ↔ externalId mapping.",
      payload: {
        kind: "http",
        method: "PATCH",
        url: "https://api.acme-saas.example.com/scim/v2/Users/2819c223-7f76-453a-919d-413861904646",
        headers: {
          Authorization: "Bearer 7b9e0c3a-2f41-4d6b-9c8e-1a5f2d3e4b6c",
          "Content-Type": "application/scim+json",
        },
        body: `{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    { "op": "replace", "path": "active", "value": false }
  ]
}`,
        annotations: [
          {
            target: "\"value\": false",
            note: "active=false disables the account without destroying it. Most production SCIM integrations off-board this way; it is reversible and preserves audit trails, unlike DELETE.",
          },
        ],
      },
    },
    {
      id: "deactivated-response",
      from: "sp",
      to: "client",
      label: "200 OK (active=false)",
      direction: "back",
      excludes: ["hard-delete"],
      description:
        "Behind the interface the SP flips the stored flag and revokes the user's ability to authenticate, while keeping the record. SCIM provisions the *state*; how the app enforces it (session revocation, login blocks) is the app's own concern. It returns 200 with the updated resource showing active=false.",
      payload: {
        kind: "raw",
        label: "200 OK · application/scim+json",
        language: "json",
        content: `{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "id": "2819c223-7f76-453a-919d-413861904646",
  "userName": "bjensen@example.com",
  "active": false,
  "meta": {
    "resourceType": "User",
    "lastModified": "2026-06-28T17:02:41Z",
    "version": "W/\\"f1c9a02e7b4d610\\"",
    "location": "https://api.acme-saas.example.com/scim/v2/Users/2819c223-7f76-453a-919d-413861904646"
  }
}`,
        annotations: [
          {
            target: "\"active\": false",
            note: "The resource still exists and remains queryable for audit — only its administrative status changed. Re-enabling is a single PATCH back to true, which is why deactivation is preferred over DELETE for off-boarding.",
          },
        ],
      },
    },
    {
      id: "delete-user",
      from: "client",
      to: "sp",
      label: "DELETE /Users/{id}",
      requires: ["hard-delete"],
      description:
        "The destructive alternative: DELETE permanently removes the resource (RFC 7644 §3.6). Use it only when retention rules require erasure — after a DELETE the id is gone and a returning user must be re-created from scratch, breaking the externalId mapping.",
      payload: {
        kind: "http",
        method: "DELETE",
        url: "https://api.acme-saas.example.com/scim/v2/Users/2819c223-7f76-453a-919d-413861904646",
        headers: {
          Authorization: "Bearer 7b9e0c3a-2f41-4d6b-9c8e-1a5f2d3e4b6c",
        },
        annotations: [
          {
            target: "DELETE",
            note: "RFC 7644 §3.6: a successful delete returns 204 No Content; a subsequent GET on the same id returns 404 with a 'detail' error. The operation is not reversible.",
          },
        ],
      },
    },
    {
      id: "deleted-response",
      from: "sp",
      to: "client",
      label: "204 No Content",
      direction: "back",
      requires: ["hard-delete"],
      description:
        "The SP removes the record from its store and returns 204 No Content (RFC 7644 §3.6). The resource id no longer resolves — any later GET/PUT/PATCH/DELETE against it yields 404 with a SCIM 'Error' response.",
      payload: {
        kind: "raw",
        label: "Response status",
        language: "http",
        content: `HTTP/1.1 204 No Content`,
        annotations: [
          {
            target: "204 No Content",
            note: "No body on success. Because the id is now gone, the externalId ↔ id mapping the client kept is invalidated — a returning user must be POSTed fresh and will receive a new id.",
          },
        ],
      },
    },
  ],
};

export default flow;
