import type { salePayments, sales } from "@lojaveiculosv2/db";
import type { InferSelectModel } from "drizzle-orm";
import type {
  SalePaymentLine,
  SaleRecord,
  SaleScope,
  SaveSaleDraftInput,
  SaveSalePaymentInput,
  UpdateSaleDraftInput,
} from "../../../domains/sales/ports/salesRepository.js";
import { isSalePaymentMethod } from "@lojaveiculosv2/shared";

type SaleRow = InferSelectModel<typeof sales>;
export type PaymentRow = InferSelectModel<typeof salePayments>;

export function toInsertSale(scope: SaleScope, input: SaveSaleDraftInput) {
  return {
    buyerSnapshot: input.buyerSnapshot ?? {},
    documentPolicySnapshot: input.documentPolicySnapshot ?? {},
    leadId: input.leadId ?? null,
    listingSnapshot: input.listingSnapshot ?? {},
    salePriceCents: input.salePriceCents ?? null,
    saleSourceSnapshot: input.saleSourceSnapshot ?? {},
    selectedDocumentKinds: [...(input.selectedDocumentKinds ?? [])],
    sellerUserId: input.sellerUserId ?? null,
    status: "draft" as const,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    unitId: input.unitId ?? null,
  };
}

export function toUpdateSale(input: UpdateSaleDraftInput) {
  return {
    ...(input.buyerSnapshot ? { buyerSnapshot: input.buyerSnapshot } : {}),
    ...(input.documentPolicySnapshot
      ? { documentPolicySnapshot: input.documentPolicySnapshot }
      : {}),
    ...(input.leadId !== undefined ? { leadId: input.leadId } : {}),
    ...(input.listingSnapshot
      ? { listingSnapshot: input.listingSnapshot }
      : {}),
    ...(input.salePriceCents !== undefined
      ? { salePriceCents: input.salePriceCents }
      : {}),
    ...(input.saleSourceSnapshot
      ? { saleSourceSnapshot: input.saleSourceSnapshot }
      : {}),
    ...(input.selectedDocumentKinds
      ? { selectedDocumentKinds: [...input.selectedDocumentKinds] }
      : {}),
    ...(input.sellerUserId !== undefined
      ? { sellerUserId: input.sellerUserId }
      : {}),
    ...(input.unitId !== undefined ? { unitId: input.unitId } : {}),
  };
}

export function toInsertPayment(
  scope: SaleScope,
  saleId: string,
  payment: SaveSalePaymentInput,
) {
  return {
    amountCents: payment.amountCents,
    dueAt: payment.dueAt ?? null,
    extraCents: payment.extraCents ?? 0,
    ...(payment.id ? { id: payment.id } : {}),
    installments: payment.installments ?? null,
    metadata: payment.metadata ?? {},
    method: payment.method,
    paidAt: payment.paidAt ?? null,
    principalCents: payment.principalCents ?? payment.amountCents,
    providerPaymentId: payment.providerPaymentId ?? null,
    saleId,
    status: payment.status ?? "pending",
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  };
}

export function toSaleRecord(
  row: SaleRow,
  paymentRows: readonly PaymentRow[],
): SaleRecord {
  return {
    buyerSnapshot: toRecord(row.buyerSnapshot),
    closedAt: row.closedAt,
    correctionOfSaleId: row.correctionOfSaleId,
    createdAt: row.createdAt,
    documentPolicySnapshot: toRecord(row.documentPolicySnapshot),
    id: row.id,
    isCurrentRevision: row.isCurrentRevision,
    leadId: row.leadId,
    listingSnapshot: toRecord(row.listingSnapshot),
    overrideReason: row.overrideReason,
    overrideRequiredFields: row.overrideRequiredFields,
    payments: paymentRows.map(toPaymentLine),
    revision: row.revision,
    salePriceCents: row.salePriceCents,
    saleSourceSnapshot: toRecord(row.saleSourceSnapshot),
    selectedDocumentKinds: toStringArray(row.selectedDocumentKinds),
    sellerUserId: row.sellerUserId,
    status: row.status,
    storeId: row.storeId,
    tenantId: row.tenantId,
    unitId: row.unitId,
    updatedAt: row.updatedAt,
  };
}

function toPaymentLine(row: PaymentRow): SalePaymentLine {
  if (!isSalePaymentMethod(row.method)) {
    throw new Error(`Unsupported sale payment method: ${row.method}`);
  }
  return {
    amountCents: row.amountCents,
    dueAt: row.dueAt,
    extraCents: row.extraCents,
    id: row.id,
    installments: row.installments,
    metadata: toRecord(row.metadata),
    method: row.method,
    paidAt: row.paidAt,
    principalCents: row.principalCents,
    providerPaymentId: row.providerPaymentId,
    status: row.status,
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}
