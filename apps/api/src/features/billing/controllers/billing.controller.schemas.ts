import { z } from "zod";

export const createBillingProviderCheckoutSchema = z.object({
  billingTypes: z
    .array(z.enum(["CREDIT_CARD", "PIX"]))
    .min(1)
    .max(2)
    .optional(),
  minutesToExpire: z.number().int().min(10).max(1440).optional(),
  nextDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const syncBillingProviderSubscriptionSchema = z.object({
  billingType: z.enum(["BOLETO", "CREDIT_CARD", "PIX", "UNDEFINED"]).optional(),
  nextDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  updatePendingPayments: z.boolean().optional(),
});

export const updateEntitlementSchema = z.object({
  endsAt: z.string().datetime().nullable().optional(),
  featureKey: z.enum([
    "analytics",
    "automation",
    "compliance",
    "crm",
    "custom_domain",
    "external_api",
    "marketplace",
    "nfe",
    "plate_lookup",
    "subdomain",
  ]),
  metadata: z.record(z.string(), z.unknown()).optional(),
  reason: z.string().min(3).max(500).nullable().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  status: z.enum(["active", "inactive", "suspended", "trialing"]),
});
