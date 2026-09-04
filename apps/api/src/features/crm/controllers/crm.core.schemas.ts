import { z } from "zod";
import {
  CRM_CHANNELS,
  CRM_ACQUISITION_SOURCES,
  CRM_CREDENTIAL_BROKERS,
  CRM_TRANSPORT_PROVIDERS,
} from "../../../domains/crm/core/models.js";

export const expectedRevisionSchema = z
  .object({
    expectedRevision: z.number().int().nonnegative(),
  })
  .strict();

export const contactCreateSchema = z
  .object({
    displayName: z.string().trim().min(1).max(191),
  })
  .strict()
  .transform((input) => ({
    ...input,
    disputed: false,
    mergedIntoContactId: null,
  }));

export const contactIdentityCreateSchema = z
  .object({
    contactId: z.string().uuid().nullable().optional(),
    kind: z.enum(["email", "phone", "provider_subject", "chat_lid"]),
    value: z.string().trim().min(1).max(320),
  })
  .strict();

const evidenceSchema = z.object({
  evidence: z.string().trim().min(1).max(500),
  occurredAt: z.coerce.date(),
  source: z.string().trim().min(1).max(120),
});

export const identityDecisionSchema = expectedRevisionSchema
  .merge(evidenceSchema)
  .extend({ contactId: z.string().uuid().optional() })
  .strict();

const interestSchema = z.object({
  kind: z.enum(["listing", "model", "other"]),
  referenceId: z.string().min(1).optional(),
  title: z.string().trim().min(1),
});
export const opportunityCreateSchema = z
  .object({
    commercialIntentConfirmed: z.literal(true),
    contactId: z.string().uuid(),
    interests: z.array(interestSchema).min(1),
    pipelineId: z.string().uuid().nullable().default(null),
    pipelineStageId: z.string().uuid().nullable().default(null),
    status: z.enum(["cancelled", "lost", "open", "won"]).default("open"),
  })
  .strict();

export const consentCreateSchema = z
  .object({
    channel: z.enum(CRM_CHANNELS),
    contactId: z.string().uuid(),
    decision: z.enum(["opt_in", "opt_out"]),
    evidence: z.string().trim().min(1).max(191),
    identityId: z.string().uuid().nullable().default(null),
    occurredAt: z.coerce.date(),
    policyVersion: z.string().trim().min(1).max(80),
    purpose: z.string().trim().min(1).max(120),
    source: z.enum(CRM_ACQUISITION_SOURCES),
  })
  .strict()
  .transform(({ decision, ...input }) => ({ ...input, status: decision }));

export const factProposalCreateSchema = z
  .object({
    contactId: z.string().uuid(),
    facts: z.record(z.string(), z.unknown()),
  })
  .strict()
  .transform((input) => ({ ...input, status: "proposed" as const }));

export const startConversationSchema = z
  .object({
    connectionId: z.string().uuid(),
    contactId: z.string().uuid(),
  })
  .strict();

export const contactPatchSchema = z
  .object({
    expectedRevision: z.number().int().nonnegative(),
    patch: z
      .object({ displayName: z.string().trim().min(1).max(191) })
      .strict(),
  })
  .strict();

export const opportunityPatchSchema = z
  .object({
    expectedRevision: z.number().int().nonnegative(),
    patch: z
      .object({
        interests: z.array(interestSchema).min(1).optional(),
        pipelineId: z.string().uuid().nullable().optional(),
        pipelineStageId: z.string().uuid().nullable().optional(),
        status: z.enum(["cancelled", "lost", "open", "won"]).optional(),
      })
      .strict()
      .refine((patch) => Object.keys(patch).length > 0, "Patch is empty."),
  })
  .strict();

export const coreListQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
