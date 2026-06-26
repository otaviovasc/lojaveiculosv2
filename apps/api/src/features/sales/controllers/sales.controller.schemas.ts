import { z } from "zod";

const optionalString = z.string().trim().min(1).nullable().optional();
const cents = z.number().int().min(0);
const metadata = z.record(z.string(), z.unknown()).optional();

export const salePaymentSchema = z.object({
  amountCents: cents,
  dueAt: z.coerce.date().nullable().optional(),
  extraCents: cents.optional(),
  installments: z.number().int().positive().nullable().optional(),
  metadata,
  method: z.string().trim().min(1),
  paidAt: z.coerce.date().nullable().optional(),
  principalCents: cents.optional(),
  providerPaymentId: optionalString,
  status: z.enum(["pending", "paid", "refunded", "cancelled"]).optional(),
});

export const saleDraftSchema = z.object({
  buyerSnapshot: metadata,
  documentPolicySnapshot: metadata,
  leadId: optionalString,
  listingSnapshot: metadata,
  payments: z.array(salePaymentSchema).optional(),
  salePriceCents: cents.nullable().optional(),
  saleSourceSnapshot: metadata,
  selectedDocumentKinds: z.array(z.string().trim().min(1)).optional(),
  sellerUserId: optionalString,
  unitId: optionalString,
});

export const listSalesQuerySchema = z.object({
  leadId: optionalString,
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sellerUserId: optionalString,
  status: z
    .enum(["all", "draft", "pending", "closed", "cancelled"])
    .default("all"),
  unitId: optionalString,
});

export const transitionSaleSchema = z.object({
  overrideReason: optionalString,
  overrideRequiredFields: z.boolean().optional(),
});
