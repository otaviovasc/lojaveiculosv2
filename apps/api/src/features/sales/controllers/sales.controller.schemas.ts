import {
  salePaymentMethods,
  salePaymentStatuses,
} from "@lojaveiculosv2/shared";
import { z } from "zod";
import { vehicleSaleDocumentKinds } from "../../../domains/vehicle/documents/vehicleWorkflowDocuments.js";
import { saleFinancingRanks } from "../../../domains/sales/saleSourceSnapshot.js";

const optionalString = z.string().trim().min(1).nullable().optional();
const cents = z.number().int().min(0);
const metadata = z.record(z.string(), z.unknown()).optional();
const snapshotText = z.string().max(500).optional();

const financingSnapshotSchema = z
  .object({
    bankName: snapshotText,
    financedAmountCents: cents.nullable().optional(),
    installmentAmountCents: cents.nullable().optional(),
    installmentsCount: z.number().int().positive().nullable().optional(),
    interestRatePercentage: z
      .number()
      .finite()
      .min(0)
      .max(100)
      .nullable()
      .optional(),
    rank: z.enum(saleFinancingRanks).nullable().optional(),
    status: z.enum(["approved", "pending", "rejected"]).optional(),
  })
  .catchall(z.unknown());

const insuranceSnapshotSchema = z
  .object({
    appliedCommissionPercentage: z
      .number()
      .finite()
      .min(10)
      .max(20)
      .nullable()
      .optional(),
    brokerName: snapshotText,
    companyName: snapshotText,
    financialProductId: z.string().uuid().nullable().optional(),
    premiumCents: cents.nullable().optional(),
    status: z.enum(["cancelled", "issued", "pending"]).optional(),
    validUntil: z.string().max(50).nullable().optional(),
  })
  .catchall(z.unknown());

const documentationSnapshotSchema = z
  .object({
    chargedAmountCents: cents.nullable().optional(),
    hasLien: z.boolean().nullable().optional(),
    notes: snapshotText,
    status: z.enum(["cancelled", "charged", "pending"]).optional(),
  })
  .catchall(z.unknown());

const commissionSnapshotSchema = z
  .object({
    amountValueCents: cents.nullable().optional(),
    enabled: z.boolean().optional(),
    notes: snapshotText,
    percentageRate: z.number().finite().min(0).max(100).nullable().optional(),
    ruleType: z.enum(["fixed", "margin", "percentage"]).optional(),
  })
  .catchall(z.unknown());

export const saleSourceSnapshotSchema = z
  .object({
    commission: commissionSnapshotSchema.optional(),
    documentation: documentationSnapshotSchema.optional(),
    financing: financingSnapshotSchema.optional(),
    insurance: insuranceSnapshotSchema.optional(),
    source: z.string().max(200).optional(),
  })
  .catchall(z.unknown());

export const salePaymentSchema = z.object({
  amountCents: cents,
  dueAt: z.coerce.date().nullable().optional(),
  extraCents: cents.optional(),
  id: z.string().trim().uuid().optional(),
  installments: z.number().int().positive().nullable().optional(),
  metadata,
  method: z.enum(salePaymentMethods),
  paidAt: z.coerce.date().nullable().optional(),
  principalCents: cents.optional(),
  providerPaymentId: optionalString,
  status: z.enum(salePaymentStatuses).optional(),
});

export const saleDraftSchema = z.object({
  buyerSnapshot: metadata,
  documentPolicySnapshot: metadata,
  leadId: optionalString,
  listingSnapshot: metadata,
  payments: z.array(salePaymentSchema).optional(),
  salePriceCents: cents.nullable().optional(),
  saleSourceSnapshot: saleSourceSnapshotSchema.optional(),
  selectedDocumentKinds: z
    .array(z.enum(vehicleSaleDocumentKinds))
    .max(vehicleSaleDocumentKinds.length)
    .refine((kinds) => new Set(kinds).size === kinds.length)
    .optional(),
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

export const revertSaleSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});
