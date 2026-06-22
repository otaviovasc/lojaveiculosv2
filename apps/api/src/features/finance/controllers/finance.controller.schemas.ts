import { z } from "zod";

export const financeEntryTypes = ["commission", "expense", "revenue"] as const;
export const financeEntryStatuses = ["cancelled", "paid", "pending"] as const;
export const financeRecurrenceFrequencies = [
  "monthly",
  "weekly",
  "yearly",
] as const;
export const commissionRuleTypes = [
  "fixed_amount",
  "manual",
  "percentage",
] as const;
export const commissionRuleStatuses = ["active", "inactive"] as const;
export const financeLinkTargets = [
  "document",
  "lead",
  "sale",
  "sale_payment",
  "vehicle_cost",
  "vehicle_listing",
  "vehicle_unit",
] as const;
export const financeDocumentKinds = [
  "buyer_document",
  "delivery_term",
  "finance_receipt",
  "inspection",
  "internal",
  "invoice",
  "other",
  "power_of_attorney",
  "reservation_receipt",
  "sale_receipt",
  "sale_contract",
  "test_drive",
  "vehicle_registration",
] as const;

export const listFinanceEntriesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
  status: z.enum(financeEntryStatuses).optional(),
  targetId: z.string().trim().min(1).optional(),
  targetType: z.enum(financeLinkTargets).optional(),
  type: z.enum(financeEntryTypes).optional(),
});

export const createFinanceEntrySchema = z.object({
  amountCents: z.number().int().positive(),
  category: z.string().trim().min(1).max(120),
  dueAt: z.coerce.date().nullable().optional(),
  links: z
    .array(
      z.object({
        targetId: z.string().trim().min(1),
        targetType: z.enum(financeLinkTargets),
      }),
    )
    .default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
  name: z.string().trim().min(1).max(191),
  paidAt: z.coerce.date().nullable().optional(),
  sellerUserId: z.string().trim().min(1).nullable().optional(),
  status: z.enum(financeEntryStatuses).default("pending"),
  type: z.enum(financeEntryTypes),
});

export const updateFinanceEntrySchema = z.object({
  amountCents: z.number().int().positive().optional(),
  category: z.string().trim().min(1).max(120).optional(),
  dueAt: z.coerce.date().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  name: z.string().trim().min(1).max(191).optional(),
  paidAt: z.coerce.date().nullable().optional(),
  sellerUserId: z.string().trim().min(1).nullable().optional(),
  status: z.enum(financeEntryStatuses).optional(),
});

export const payFinanceEntrySchema = z.object({
  paidAt: z.coerce.date().nullable().optional(),
});

export const cancelFinanceEntrySchema = z.object({
  reason: z.string().trim().min(1).nullable().optional(),
});

export const createRecurringEntrySchema = createFinanceEntrySchema
  .omit({ links: true, paidAt: true })
  .extend({
    dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
    frequency: z.enum(financeRecurrenceFrequencies),
    nextDueAt: z.coerce.date(),
  });

export const listRecurringEntriesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
  type: z.enum(financeEntryTypes).optional(),
});

export const createCommissionRuleSchema = z.object({
  category: z.string().trim().min(1).max(120),
  fixedAmountCents: z.number().int().positive().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  name: z.string().trim().min(1).max(191),
  percentageBasisPoints: z
    .number()
    .int()
    .min(1)
    .max(10000)
    .nullable()
    .optional(),
  sellerUserId: z.string().trim().min(1).nullable().optional(),
  status: z.enum(commissionRuleStatuses).default("active"),
  type: z.enum(commissionRuleTypes),
});

export const listCommissionRulesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
  sellerUserId: z.string().trim().min(1).optional(),
  status: z.enum(commissionRuleStatuses).optional(),
});

export const financeDocumentUploadSchema = z.object({
  contentType: z.string().trim().min(1).max(120),
  fileName: z.string().trim().min(1).max(191),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024),
});

export const attachFinanceDocumentSchema = z.object({
  fileName: z.string().trim().min(1).max(191),
  fileSizeBytes: z.number().int().positive().nullable().optional(),
  kind: z.enum(financeDocumentKinds).default("finance_receipt"),
  linkRole: z.string().trim().min(1).max(80).optional(),
  mimeType: z.string().trim().min(1).max(120).nullable().optional(),
  storageKey: z.string().trim().min(1),
  title: z.string().trim().min(1).max(191),
});
