import { z } from "zod";
import { crmChannels, externalBotActionRegistry } from "./crmContracts.js";

const nonEmptyString = z.string().trim().min(1);
const nullableTimestamp = z.string().datetime({ offset: true }).nullable();

export const crmExternalBotConfigurationSchema = z
  .object({
    createdAt: nullableTimestamp,
    enabled: z.boolean(),
    id: nonEmptyString.nullable(),
    secretConfigured: z.boolean(),
    secretUpdatedAt: nullableTimestamp,
    updatedAt: nullableTimestamp,
    webhookUrl: z.string().url().max(500).nullable(),
  })
  .strict();
export type CrmExternalBotConfiguration = z.infer<
  typeof crmExternalBotConfigurationSchema
>;

export const crmExternalBotConfigurationReadSchema = z
  .object({ configuration: crmExternalBotConfigurationSchema })
  .strict();
export type CrmExternalBotConfigurationRead = z.infer<
  typeof crmExternalBotConfigurationReadSchema
>;

export const crmExternalBotConfigurationPatchSchema = z
  .object({
    enabled: z.boolean().optional(),
    webhookSecret: z.string().trim().min(32).max(256).nullable().optional(),
    webhookUrl: z.string().trim().url().max(500).nullable().optional(),
  })
  .strict();
export type CrmExternalBotConfigurationPatchInput = z.infer<
  typeof crmExternalBotConfigurationPatchSchema
>;

export const crmExternalBotTestInputSchema = z
  .object({
    action: z.enum(externalBotActionRegistry),
    channel: z.enum(crmChannels),
  })
  .strict();
export type CrmExternalBotTestInput = z.infer<
  typeof crmExternalBotTestInputSchema
>;

export const crmExternalBotTestStatuses = ["dry_run_ready", "blocked"] as const;

export const crmExternalBotTestResultSchema = z
  .object({
    action: z.enum(externalBotActionRegistry),
    channel: z.enum(crmChannels),
    diagnostics: z
      .object({
        code: nonEmptyString,
        message: nonEmptyString,
        providerOperationId: nonEmptyString.nullable().optional(),
        retryable: z.boolean(),
      })
      .strict(),
    officialOperationOccurred: z.literal(false),
    requestId: nonEmptyString,
    status: z.enum(crmExternalBotTestStatuses),
  })
  .strict();
export type CrmExternalBotTestResult = z.infer<
  typeof crmExternalBotTestResultSchema
>;

export const crmExternalBotActionAcceptedStatuses = [
  "accepted",
  "pending_approval",
  "authorized",
  "claimed",
  "executing",
  "provider_succeeded",
  "completed",
  "retryable_failed",
  "indeterminate",
  "dead_letter",
  "cancelled",
] as const;

export const crmExternalBotActionAcceptedResultSchema = z
  .object({
    actionId: nonEmptyString,
    providerOperationId: nonEmptyString.nullable().optional(),
    requestId: nonEmptyString,
    status: z.enum(crmExternalBotActionAcceptedStatuses),
  })
  .strict();
export type CrmExternalBotActionAcceptedResult = z.infer<
  typeof crmExternalBotActionAcceptedResultSchema
>;

export const crmExternalBotProposalDecisionInputSchema = z
  .object({
    decision: z.enum(["approved", "rejected"]),
    expectedRevision: z.number().int().nonnegative(),
    reason: z.string().trim().min(1).max(500).optional(),
  })
  .strict();
export type CrmExternalBotProposalDecisionInput = z.infer<
  typeof crmExternalBotProposalDecisionInputSchema
>;

export const crmExternalBotProposalDecisionResultSchema = z
  .object({
    actionId: nonEmptyString,
    actionStatus: z.enum(crmExternalBotActionAcceptedStatuses),
    decision: z.enum(["approved", "rejected"]),
    proposalId: nonEmptyString,
    proposalRevision: z.number().int().nonnegative(),
    requestId: nonEmptyString,
  })
  .strict();
export type CrmExternalBotProposalDecisionResult = z.infer<
  typeof crmExternalBotProposalDecisionResultSchema
>;
