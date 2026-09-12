import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);
const nullableTimestamp = z.string().datetime({ offset: true }).nullable();

export const crmExternalBotProfileSchema = z
  .object({
    apiTokenConfigured: z.boolean(),
    createdAt: nullableTimestamp,
    enabled: z.boolean(),
    id: nonEmptyString,
    isDefault: z.boolean(),
    name: nonEmptyString,
    secretConfigured: z.boolean(),
    secretUpdatedAt: nullableTimestamp,
    updatedAt: nullableTimestamp,
    webhookUrl: z.string().url().max(500).nullable(),
  })
  .strict();
export type CrmExternalBotProfile = z.infer<typeof crmExternalBotProfileSchema>;

export const crmExternalBotProfileListSchema = z
  .object({ profiles: z.array(crmExternalBotProfileSchema) })
  .strict();
export type CrmExternalBotProfileList = z.infer<
  typeof crmExternalBotProfileListSchema
>;

export const crmExternalBotProfileCreateSchema = z
  .object({
    apiToken: z.string().trim().min(32).max(256).nullable().optional(),
    enabled: z.boolean().optional(),
    name: z.string().trim().min(1).max(160),
    webhookSecret: z.string().trim().min(32).max(256).nullable().optional(),
    webhookUrl: z.string().trim().url().max(500).nullable().optional(),
  })
  .strict();
export type CrmExternalBotProfileCreateInput = z.infer<
  typeof crmExternalBotProfileCreateSchema
>;

export const crmExternalBotProfilePatchSchema = z
  .object({
    apiToken: z.string().trim().min(32).max(256).nullable().optional(),
    enabled: z.boolean().optional(),
    isDefault: z.boolean().optional(),
    name: z.string().trim().min(1).max(160).optional(),
    webhookSecret: z.string().trim().min(32).max(256).nullable().optional(),
    webhookUrl: z.string().trim().url().max(500).nullable().optional(),
  })
  .strict();
export type CrmExternalBotProfilePatchInput = z.infer<
  typeof crmExternalBotProfilePatchSchema
>;

export const crmExternalBotProfileAssignmentSchema = z
  .object({
    connectionId: nonEmptyString,
    profileId: nonEmptyString.nullable(),
  })
  .strict();
export type CrmExternalBotProfileAssignment = z.infer<
  typeof crmExternalBotProfileAssignmentSchema
>;

export const crmExternalBotProfileAssignmentListSchema = z
  .object({ assignments: z.array(crmExternalBotProfileAssignmentSchema) })
  .strict();
export type CrmExternalBotProfileAssignmentList = z.infer<
  typeof crmExternalBotProfileAssignmentListSchema
>;

export const crmExternalBotProfileAssignmentPatchSchema = z
  .object({ profileId: nonEmptyString.nullable() })
  .strict();
export type CrmExternalBotProfileAssignmentPatchInput = z.infer<
  typeof crmExternalBotProfileAssignmentPatchSchema
>;
