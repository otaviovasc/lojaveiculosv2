import {
  financeAutoEntryEvents,
  financeAutoEntryFinancingRanks,
  financeAutoEntryMaxAmountCents,
  financeAutoEntryMaxRatePpm,
  financeAutoEntryOutputTypes,
  financeAutoEntryPercentageBases,
  financeAutoEntryRuleResolutions,
  financeAutoEntryRuleStatuses,
} from "@lojaveiculosv2/shared";
import { z } from "zod";

const calculationSchema = z.discriminatedUnion("kind", [
  z.object({
    amountCents: z
      .number()
      .int()
      .positive()
      .max(financeAutoEntryMaxAmountCents),
    kind: z.literal("fixed"),
  }),
  z.object({
    basis: z.enum(financeAutoEntryPercentageBases),
    basisPoints: z.number().int().min(1).max(10_000),
    kind: z.literal("percentage"),
  }),
  z.object({
    basis: z.enum(financeAutoEntryPercentageBases),
    kind: z.literal("rate_ppm"),
    ratePpm: z.number().int().min(1).max(financeAutoEntryMaxRatePpm),
  }),
]);

const recipientSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("event_seller") }),
  z.object({
    kind: z.literal("fixed_user"),
    userId: z.string().trim().uuid(),
  }),
  z.object({ kind: z.literal("none") }),
]);

const basisRangeSchema = z
  .object({
    basis: z.enum(financeAutoEntryPercentageBases),
    maxCents: z.number().int().nonnegative().nullable().optional(),
    minCents: z.number().int().nonnegative().optional(),
  })
  .refine(
    ({ maxCents, minCents }) =>
      maxCents === undefined ||
      maxCents === null ||
      minCents === undefined ||
      maxCents >= minCents,
    { message: "Basis range maximum must be at least the minimum." },
  );

const conditionsSchema = z.object({
  basisRange: basisRangeSchema.optional(),
  financingRank: z.enum(financeAutoEntryFinancingRanks).optional(),
  standardCommissionEnabled: z.boolean().optional(),
  transferHasLien: z.boolean().optional(),
});

const ruleKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9][a-z0-9._-]*$/)
  .nullable();

const timingSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("same_day") }),
  z.object({
    days: z.number().int().min(1).max(365),
    kind: z.literal("days_after"),
  }),
  z.object({
    day: z.number().int().min(1).max(31),
    kind: z.literal("day_of_month"),
  }),
  z.object({
    day: z.number().int().min(1).max(31),
    kind: z.literal("next_month_day"),
  }),
]);

const ruleFields = {
  calculation: calculationSchema,
  category: z.string().trim().min(1).max(120).nullable(),
  conditions: conditionsSchema,
  event: z.enum(financeAutoEntryEvents),
  family: ruleKeySchema,
  metadata: z.record(z.string(), z.unknown()),
  name: z.string().trim().min(1).max(191).nullable(),
  outputType: z.enum(financeAutoEntryOutputTypes),
  priority: z.number().int().min(0).max(100),
  recipient: recipientSchema,
  resolution: z.enum(financeAutoEntryRuleResolutions),
  ruleKey: ruleKeySchema,
  sellerUserId: z.string().trim().uuid().nullable(),
  status: z.enum(financeAutoEntryRuleStatuses),
  timing: timingSchema,
} as const;

export const createFinanceAutoEntryRuleSchema = z.object({
  ...ruleFields,
  category: ruleFields.category.default(null),
  conditions: ruleFields.conditions.default({}),
  family: ruleFields.family.default(null),
  metadata: ruleFields.metadata.default({}),
  name: ruleFields.name.default(null),
  priority: ruleFields.priority.default(0),
  recipient: ruleFields.recipient.default({ kind: "event_seller" }),
  resolution: ruleFields.resolution.default("additive"),
  ruleKey: ruleFields.ruleKey.default(null),
  sellerUserId: ruleFields.sellerUserId.default(null),
  status: ruleFields.status.default("active"),
});

export const updateFinanceAutoEntryRuleSchema = z
  .object(ruleFields)
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one rule field is required.",
  });

export const listFinanceAutoEntryRulesQuerySchema = z.object({
  event: z.enum(financeAutoEntryEvents).optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
  sellerUserId: z.string().trim().uuid().optional(),
  status: z.enum(financeAutoEntryRuleStatuses).optional(),
});
