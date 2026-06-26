import type { Flow } from "@/lib/types";

/**
 * TEMPLATE — copy this folder to
 *   content/protocols/<protocol-id>/flows/<flow-id>/
 * then fill it in. The `_template` directory is ignored by the registry.
 *
 * Rules enforced by `npm run validate-content`:
 *  - ids are lowercase-kebab-case
 *  - protocolId matches the parent protocol folder
 *  - every step.from / step.to is a declared actor id
 *  - every requires/excludes references a declared param id
 *  - payloads are one of: http | jwt | xml | raw
 */
const flow: Flow = {
  id: "example-flow", // = the folder name
  protocolId: "example-protocol", // = the parent protocol folder name + meta.id
  title: "Human-Readable Flow Title",
  summary: "One or two sentences describing what this flow accomplishes.",
  specRefs: [{ label: "RFC / spec name", url: "https://example.com/spec" }],
  // topology: true,   // OPT-IN: only if you want the spatial "Topology" view. Default off.
  actors: [
    { id: "user", label: "User", role: "user" },
    { id: "client", label: "Client App", role: "client" },
    { id: "authServer", label: "Authorization Server", role: "authServer" },
  ],
  // Optional toggles that add/remove steps (see requires/excludes below).
  params: [
    {
      id: "example-param",
      label: "Example Toggle",
      description: "Explain what turning this on/off demonstrates.",
      defaultOn: true,
    },
  ],
  steps: [
    {
      id: "first-step",
      from: "user",
      to: "client",
      label: "Short arrow label",
      description: "Educational explanation shown in the inspector panel.",
      // direction: "back",            // dashed line for responses (optional)
      // requires: ["example-param"],  // only shown when the param is ON
      // excludes: ["example-param"],  // only shown when the param is OFF
    },
    {
      id: "request-step",
      from: "client",
      to: "authServer",
      label: "POST /endpoint",
      description: "Describe the request and why each parameter matters.",
      payload: {
        kind: "http",
        method: "POST",
        url: "https://auth.example.com/endpoint",
        headers: { "Content-Type": "application/json" },
        body: '{"example":"value"}',
        annotations: [{ target: "example", note: "Why this field matters." }],
      },
    },
    {
      id: "token-step",
      from: "authServer",
      to: "client",
      label: "Returns a JWT",
      direction: "back",
      description: "Describe the token and which claims to validate.",
      payload: {
        kind: "jwt",
        token: "<header>.<payload>.<signature>", // real base64url segments
        annotations: [{ target: "aud", note: "Must equal your client_id." }],
      },
    },
  ],
};

export default flow;
