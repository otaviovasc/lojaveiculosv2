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

  it("requires active payment principal to settle the sale price exactly", () => {
    const underpaid = saleRecord([
      payment({ id: "pix_under", method: "pix", principalCents: 1_999 }),
    ]);
    const overpaid = saleRecord([
      payment({ id: "pix_over", method: "pix", principalCents: 2_001 }),
    ]);

    expect(collectMissingSaleFields(underpaid)).toContain(
      "payment_principal_coverage",
    );
    expect(collectMissingSaleFields(overpaid)).toContain(
      "payment_principal_exceeds_sale_price",
    );
  });

  it("rejects a manual trade-in payment without an enabled snapshot", () => {
    const sale = saleRecord([
      payment({ id: "trade_1", method: "trade_in", principalCents: 2_000 }),
    ]);

    expect(collectMissingSaleFields(sale)).toContain("trade_in_snapshot");
  });

  it("requires every V1-equivalent trade-in fact before closing", () => {
    const sale = saleRecord([
      payment({ id: "trade_1", method: "trade_in", principalCents: 2_000 }),
    ]);
    sale.saleSourceSnapshot = { tradeIn: { enabled: true } };

    expect(collectMissingSaleFields(sale)).toEqual([
      "trade_in_brand",
      "trade_in_model",
      "trade_in_plate",
      "trade_in_manufacture_year",
      "trade_in_model_year",
      "trade_in_color",
      "trade_in_chassi",
      "trade_in_renavam",
      "trade_in_valuation",
    ]);
  });

  it("accepts a complete enabled trade-in with normalized identifiers", () => {
    const sale = saleRecord([
      payment({ id: "trade_1", method: "trade_in", principalCents: 2_000 }),
    ]);
    sale.saleSourceSnapshot = {
      tradeIn: {
        catalog: { brandName: "Honda", modelName: "Civic", modelYear: 2021 },
        chassi: "93H-FC1630-KZ123456",
        color: "Prata",
        enabled: true,
        plate: "ABC-1D23",
        renavam: "123.456.789-01",
        valuationCents: 2_000,
        yearFabrication: 2020,
      },
    };

    expect(collectMissingSaleFields(sale)).toEqual([]);
  });

  it("requires enabled trade-in value and payment principal to stay synchronized", () => {
    const sale = saleRecord([
      payment({ id: "trade_1", method: "trade_in", principalCents: 1_500 }),
      payment({ id: "pix_1", method: "pix", principalCents: 500 }),
    ]);
    sale.saleSourceSnapshot = {
      tradeIn: {
        brand: "Honda",
        chassi: "93HFC1630KZ123456",
        color: "Prata",
        enabled: true,
        model: "Civic",
        plate: "ABC1D23",
        renavam: "12345678901",
        valuationCents: 2_000,
        yearFabrication: 2020,
        yearModel: 2021,
      },
    };

    expect(collectMissingSaleFields(sale)).toContain(
      "trade_in_payment_valuation",
    );
  });

  it("requires an active trade-in payment when the snapshot is enabled", () => {
    const sale = saleRecord([
      payment({ id: "pix_1", method: "pix", principalCents: 2_000 }),
    ]);
    sale.saleSourceSnapshot = {
      tradeIn: {
        brand: "Honda",
        chassi: "93HFC1630KZ123456",
        color: "Prata",
        enabled: true,
        model: "Civic",
        plate: "ABC1D23",
        renavam: "12345678901",
        valuationCents: 2_000,
        yearFabrication: 2020,
        yearModel: 2021,
      },
    };

    expect(collectMissingSaleFields(sale)).toContain("trade_in_payment");
  });

  it("rejects duplicate active trade-in payment lines", () => {
    const sale = saleRecord([
      payment({ id: "trade_1", method: "trade_in", principalCents: 1_000 }),
      payment({ id: "trade_2", method: "trade_in", principalCents: 1_000 }),
    ]);
    sale.saleSourceSnapshot = {
      tradeIn: {
        brand: "Honda",
        chassi: "93HFC1630KZ123456",
        color: "Prata",
        enabled: true,
        model: "Civic",
        plate: "ABC1D23",
        renavam: "12345678901",
        valuationCents: 2_000,
        yearFabrication: 2020,
        yearModel: 2021,
      },
    };

    expect(collectMissingSaleFields(sale)).toContain("trade_in_payment_count");
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
