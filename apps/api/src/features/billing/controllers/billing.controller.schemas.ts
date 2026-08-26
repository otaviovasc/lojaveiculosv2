import { z } from "zod";

export const createBillingPlanHireSchema = z.object({
  billingTypes: z
    .array(z.enum(["CREDIT_CARD", "PIX"]))
    .min(1)
    .max(2)
    .optional(),
  idempotencyKey: z.string().trim().min(8).max(191),
  planId: z.string().uuid(),
  quoteId: z.string().uuid().optional(),
});

export const requestBillingPlanQuoteSchema = z.object({
  planId: z.string().uuid(),
});

export const approveBillingPlanQuoteSchema = z.object({
  expiresAt: z.string().datetime(),
  quotedCents: z.number().int().min(89_700),
});
