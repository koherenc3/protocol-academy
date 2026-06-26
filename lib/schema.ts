import { z } from "zod";

/**
 * The machine-readable contract every flow must satisfy.
 *
 * This Zod schema is the single source of truth: the TypeScript types in
 * `lib/types.ts` are derived from it, and `scripts/validate-content.ts` runs
 * every flow through it at build time. A coding agent that authors a new
 * `steps.ts` gets precise, located error messages when it deviates.
 *
 * When you add a new protocol that needs a new payload shape (e.g. SAML XML,
 * Kerberos tickets), add a member to `PayloadSchema` and a matching viewer in
 * `components/payload/`. Nothing else in the engine needs to change.
 */

const slug = z
  .string()
  .min(1)
  .regex(/^[a-z0-9-]+$/, "must be lowercase kebab-case (a-z, 0-9, -)");

// Roles drive lane coloring and ordering in the diagram.
export const ActorRoleSchema = z.enum([
  "user",
  "browser",
  "client",
  "authServer",
  "resourceServer",
  "system",
]);

export const ActorSchema = z.object({
  id: slug,
  label: z.string().min(1),
  role: ActorRoleSchema,
  description: z.string().optional(),
});

// ---- Payload variants (discriminated union on `kind`) ---------------------

const AnnotationSchema = z.object({
  // A substring or field name to call out in the payload, with an explanation.
  target: z.string().min(1),
  note: z.string().min(1),
});

const JwtPayloadSchema = z.object({
  kind: z.literal("jwt"),
  // The compact serialization: header.payload.signature (base64url segments).
  token: z.string().min(1).includes("."),
  // Optional plain-language notes about specific claims (iss, aud, nonce, ...).
  annotations: z.array(AnnotationSchema).optional(),
});

const HttpPayloadSchema = z.object({
  kind: z.literal("http"),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "302", "303"]),
  url: z.string().min(1),
  query: z.record(z.string()).optional(),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  annotations: z.array(AnnotationSchema).optional(),
});

const XmlPayloadSchema = z.object({
  kind: z.literal("xml"),
  xml: z.string().min(1),
  annotations: z.array(AnnotationSchema).optional(),
});

const RawPayloadSchema = z.object({
  kind: z.literal("raw"),
  label: z.string().optional(),
  content: z.string().min(1),
  language: z.string().optional(),
  annotations: z.array(AnnotationSchema).optional(),
});

export const PayloadSchema = z.discriminatedUnion("kind", [
  JwtPayloadSchema,
  HttpPayloadSchema,
  XmlPayloadSchema,
  RawPayloadSchema,
]);

// ---- Steps, params, flow --------------------------------------------------

export const FlowStepSchema = z.object({
  id: slug,
  from: z.string().min(1), // actor id
  to: z.string().min(1), // actor id
  label: z.string().min(1), // short message label on the arrow
  // omitted = "forward" (solid arrow); "back" renders a dashed response arrow.
  direction: z.enum(["forward", "back"]).optional(),
  // Transport channel, the key OAuth/OIDC teaching distinction:
  //   "front"  = travels through the user-agent/browser (visible in the URL,
  //              less trusted).
  //   "direct" = back-channel, server-to-server (not visible to the browser).
  // If omitted, it is inferred (front when the browser/user is an endpoint).
  channel: z.enum(["front", "direct"]).optional(),
  description: z.string().min(1), // educational explanation shown in the inspector
  payload: PayloadSchema.optional(),
  // ids of params (see ParamToggle) that must be ON for this step to apply.
  requires: z.array(slug).optional(),
  // ids of params that must be OFF for this step to apply.
  excludes: z.array(slug).optional(),
});

export const ParamToggleSchema = z.object({
  id: slug,
  label: z.string().min(1),
  description: z.string().min(1),
  // omitted = on by default.
  defaultOn: z.boolean().optional(),
});

export const FlowSchema = z.object({
  id: slug,
  protocolId: slug,
  title: z.string().min(1),
  summary: z.string().min(1),
  specRefs: z
    .array(z.object({ label: z.string().min(1), url: z.string().url() }))
    .optional(),
  // Opt-in: show the secondary "Topology" view toggle for this flow. Off by
  // default — only enable when a spatial/architecture view adds value.
  topology: z.boolean().optional(),
  actors: z.array(ActorSchema).min(2),
  params: z.array(ParamToggleSchema).optional(),
  steps: z.array(FlowStepSchema).min(1),
});

export const ProtocolMetaSchema = z.object({
  id: slug,
  name: z.string().min(1),
  category: z.string().min(1),
  summary: z.string().min(1),
  // Optional ordering hint for the landing page.
  order: z.number().optional(),
});

/**
 * Cross-field validation that a flat schema can't express: every step's
 * `from`/`to` and every `requires`/`excludes` must reference declared ids.
 * Returns a list of human-readable problems (empty = valid).
 */
export function validateFlowReferences(flow: z.infer<typeof FlowSchema>): string[] {
  const problems: string[] = [];
  const actorIds = new Set(flow.actors.map((a) => a.id));
  const paramIds = new Set((flow.params ?? []).map((p) => p.id));

  for (const step of flow.steps) {
    if (!actorIds.has(step.from)) {
      problems.push(`step "${step.id}": from "${step.from}" is not a declared actor`);
    }
    if (!actorIds.has(step.to)) {
      problems.push(`step "${step.id}": to "${step.to}" is not a declared actor`);
    }
    for (const p of step.requires ?? []) {
      if (!paramIds.has(p)) {
        problems.push(`step "${step.id}": requires "${p}" is not a declared param`);
      }
    }
    for (const p of step.excludes ?? []) {
      if (!paramIds.has(p)) {
        problems.push(`step "${step.id}": excludes "${p}" is not a declared param`);
      }
    }
  }
  return problems;
}
