import type { SaleRecord } from "../../../domains/sales/ports/salesRepository.js";

export function saleRecord(
  saleSourceSnapshot: Record<string, unknown>,
  payments: SaleRecord["payments"] = [],
): SaleRecord {
  return {
    buyerSnapshot: { name: "Maria" },
    closedAt: new Date("2026-07-13T12:00:00.000Z"),
    correctionOfSaleId: null,
    createdAt: new Date("2026-07-01T10:00:00.000Z"),
    documentPolicySnapshot: {},
    id: "sale_1",
    isCurrentRevision: true,
    leadId: "lead_1",
    listingSnapshot: {},
    overrideReason: null,
    overrideRequiredFields: false,
    payments,
    revision: 3,
    salePriceCents: 5_000_000,
    saleSourceSnapshot,
    selectedDocumentKinds: [],
    sellerUserId: "seller_1",
    status: "closed",
    storeId: "store_1",
    tenantId: "tenant_1",
    unitId: "unit_1",
    updatedAt: new Date("2026-07-13T11:59:00.000Z"),
  };
}

export function financingPayment(
  id: string,
  principalCents: number,
  metadata: Record<string, unknown> = {},
): SaleRecord["payments"][number] {
  return {
    amountCents: principalCents,
    dueAt: null,
    extraCents: 0,
    id,
    installments: null,
    metadata,
    method: "financing",
    paidAt: null,
    principalCents,
    providerPaymentId: null,
    status: "pending",
  };
}
