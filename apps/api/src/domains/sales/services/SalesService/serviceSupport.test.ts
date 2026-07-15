import { describe, expect, it } from "vitest";
import type {
  SalePaymentLine,
  SaleRecord,
} from "../../ports/salesRepository.js";
import {
  collectMissingSaleFields,
  validateSaleReadiness,
} from "./serviceSupport.js";

describe("sale service readiness", () => {
  it("requires dates and installment counts on active payments", () => {
    const sale = saleRecord([
      payment({ dueAt: null, id: "pix_1", method: "pix" }),
      payment({
        id: "card_1",
        installments: null,
        method: "credit_card",
      }),
      payment({
        dueAt: null,
        id: "cancelled_1",
        installments: null,
        method: "financing",
        status: "cancelled",
      }),
    ]);

    expect(collectMissingSaleFields(sale)).toEqual([
      "payment_due_at:pix_1",
      "payment_installments:card_1",
    ]);
    expect(() => validateSaleReadiness(sale)).toThrow(
      "payment_due_at:pix_1, payment_installments:card_1",
    );
  });
});

function saleRecord(payments: readonly SalePaymentLine[]): SaleRecord {
  const now = new Date("2026-07-14T12:00:00.000Z");
  return {
    buyerSnapshot: { name: "Cliente" },
    closedAt: null,
    correctionOfSaleId: null,
    createdAt: now,
    documentPolicySnapshot: {},
    id: "sale_1",
    isCurrentRevision: true,
    leadId: "lead_1",
    listingSnapshot: {},
    overrideReason: null,
    overrideRequiredFields: false,
    payments,
    revision: 1,
    salePriceCents: 2000,
    saleSourceSnapshot: {},
    selectedDocumentKinds: [],
    sellerUserId: "seller_1",
    status: "draft",
    storeId: "store_1",
    tenantId: "tenant_1",
    unitId: "unit_1",
    updatedAt: now,
  };
}

function payment(
  overrides: Partial<SalePaymentLine> & Pick<SalePaymentLine, "id" | "method">,
): SalePaymentLine {
  return {
    amountCents: 1000,
    dueAt: new Date("2026-07-15T12:00:00.000Z"),
    extraCents: 0,
    installments: null,
    metadata: {},
    paidAt: null,
    principalCents: 1000,
    providerPaymentId: null,
    status: "pending",
    ...overrides,
  };
}
