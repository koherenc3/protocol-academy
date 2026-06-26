import type { z } from "zod";
import type {
  ActorSchema,
  ActorRoleSchema,
  PayloadSchema,
  FlowStepSchema,
  ParamToggleSchema,
  FlowSchema,
  ProtocolMetaSchema,
} from "./schema";

/**
 * Types are DERIVED from the Zod schema in `lib/schema.ts` so the runtime
 * contract and the compile-time contract can never drift. Author flows against
 * these types; validation enforces them.
 */

export type ActorRole = z.infer<typeof ActorRoleSchema>;
export type Actor = z.infer<typeof ActorSchema>;
export type Payload = z.infer<typeof PayloadSchema>;
export type PayloadKind = Payload["kind"];
export type FlowStep = z.infer<typeof FlowStepSchema>;
export type ParamToggle = z.infer<typeof ParamToggleSchema>;
export type Flow = z.infer<typeof FlowSchema>;
export type ProtocolMeta = z.infer<typeof ProtocolMetaSchema>;

// Narrowed payload helpers for the viewers.
export type JwtPayload = Extract<Payload, { kind: "jwt" }>;
export type HttpPayload = Extract<Payload, { kind: "http" }>;
export type XmlPayload = Extract<Payload, { kind: "xml" }>;
export type RawPayload = Extract<Payload, { kind: "raw" }>;

// A protocol as assembled by the registry: its metadata plus all its flows.
export interface Protocol extends ProtocolMeta {
  flows: Flow[];
}
