import { describe, expect, it } from "vitest";
import {
  financingPaymentSyncState,
  synchronizeSingleFinancingPayment,
} from "./salePaymentSync";
import type { SalePaymentLine, SaleRecord } from "./types";

describe("sale payment synchronization", () => {
  it("synchronizes one financing line from the authoritative panel snapshot", () => {
    const sale = saleRecord([financingPayment()]);
    const synchronized = synchronizeSingleFinancingPayment(sale, {
      bankName: "Banco BV",
      financedAmountCents: 8_000_000,
      installmentAmountCents: 200_000,
      installmentsCount: 48,
      interestRatePercentage: 1.49,
      rank: "R0",
      status: "approved",
    });

    expect(synchronized.payments[0]).toMatchObject({
      amountCents: 8_000_500,
      extraCents: 500,
      installments: 48,
      metadata: {
        bankName: "Banco BV",
        financedAmountCents: 8_000_000,
        financingRank: "R0",
        financingStatus: "approved",
        installmentAmountCents: 200_000,
        installmentsCount: 48,
        interestRatePercentage: 1.49,
        methodReference: "Banco BV",
      },
      principalCents: 8_000_000,
    });
  });

  it("does not overwrite per-line facts when multiple financing payments exist", () => {
    const sale = saleRecord([
      financingPayment({ id: "financing_1", principalCents: 1_000_000 }),
      financingPayment({ id: "financing_2", principalCents: 2_000_000 }),
    ]);

    expect(financingPaymentSyncState(sale)).toBe("multiple");
    expect(
      synchronizeSingleFinancingPayment(sale, {
        financedAmountCents: 9_000_000,
        rank: "R4",
      }),
    ).toBe(sale);
  });

  it("preserves principal when a bank-only edit has no aggregate amount", () => {
    const sale = saleRecord([financingPayment()]);
    const synchronized = synchronizeSingleFinancingPayment(sale, {
      bankName: "Santander",
      rank: "R1",
    });

    expect(synchronized.payments[0]).toMatchObject({
      amountCents: 100_500,
      metadata: {
        bankName: "Santander",
        financingRank: "R1",
        methodReference: "Santander",
      },
      principalCents: 100_000,
    });
  });

  it("detects and reconciles a payment added after the panel was populated", () => {
    const financing = {
      bankName: "Banco Pan",
      financedAmountCents: 4_000_000,
      installmentsCount: 36,
      rank: "R2",
    };
    const sale = saleRecord([financingPayment()]);

    expect(financingPaymentSyncState(sale, financing)).toBe("single_mismatch");
    const synchronized = synchronizeSingleFinancingPayment(sale, financing);
    expect(financingPaymentSyncState(synchronized, financing)).toBe("single");
    expect(synchronized.payments[0]).toMatchObject({
      installments: 36,
      metadata: {
        financingRank: "R2",
        methodReference: "Banco Pan",
      },
      principalCents: 4_000_000,
    });
  });
});

function financingPayment(
  overrides: Partial<SalePaymentLine> = {},
): SalePaymentLine {
  return {
    amountCents: 100_500,
    dueAt: "2026-08-21",
    extraCents: 500,
    id: "financing_1",
    installments: 12,
    metadata: {},
    method: "financing",
    paidAt: null,
    principalCents: 100_000,
    providerPaymentId: null,
    status: "pending",
    ...overrides,
  };
}

function saleRecord(payments: SalePaymentLine[]): SaleRecord {
  return {
    buyerSnapshot: {},
    closedAt: null,
    correctionOfSaleId: null,
    createdAt: "2026-08-21T00:00:00.000Z",
    documentPolicySnapshot: {},
    id: "sale_1",
    isCurrentRevision: true,
    leadId: "lead_1",
    listingId: "listing_1",
    listingSnapshot: {},
    overrideReason: null,
    overrideRequiredFields: false,
    payments,
    revision: 1,
    salePriceCents: 10_000_000,
    saleSourceSnapshot: {},
    selectedDocumentKinds: [],
    sellerUserId: "seller_1",
    status: "draft",
    unitId: "unit_1",
    updatedAt: "2026-08-21T00:00:00.000Z",
  };
}
