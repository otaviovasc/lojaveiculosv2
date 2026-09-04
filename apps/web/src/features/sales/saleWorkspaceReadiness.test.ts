import { describe, expect, it } from "vitest";
import {
  canNavigateToSaleWorkspaceStep,
  getSaleCloseMissingFields,
  getSaleWorkspaceStepReadiness,
  getTradeInSnapshotMissingFields,
} from "./saleWorkspaceReadiness";
import type { SaleRecord } from "./types";

describe("sale workspace readiness", () => {
  it("groups close requirements by the step that can resolve them", () => {
    const sale = saleRecord({
      buyerSnapshot: { ...validBuyerSnapshot(), name: "" },
      leadId: null,
      payments: [],
      selectedDocumentKinds: [],
      sellerUserId: null,
      unitId: null,
    });

    const readiness = getSaleWorkspaceStepReadiness(sale);

    expect(readiness[0]?.missingFields).toEqual([
      "Comprador",
      "Lead",
      "Veículo",
      "Vendedor",
    ]);
    expect(readiness[1]?.missingFields).toEqual(["Pagamentos"]);
    expect(readiness[2]?.missingFields).toEqual([
      "Contrato de Compra e Venda",
      "Recibo de Venda",
    ]);
    expect(readiness[3]?.missingFields).toEqual([
      "Comprador",
      "Lead",
      "Veículo",
      "Vendedor",
      "Pagamentos",
      "Contrato de Compra e Venda",
      "Recibo de Venda",
    ]);
  });

  it("blocks only forward draft navigation across incomplete steps", () => {
    const draft = saleRecord({
      buyerSnapshot: { ...validBuyerSnapshot(), name: "" },
    });
    const readiness = getSaleWorkspaceStepReadiness(draft);

    expect(
      canNavigateToSaleWorkspaceStep({
        currentStep: 0,
        readiness,
        sale: draft,
        targetStep: 1,
      }),
    ).toBe(false);
    expect(
      canNavigateToSaleWorkspaceStep({
        currentStep: 2,
        readiness,
        sale: draft,
        targetStep: 0,
      }),
    ).toBe(true);
    expect(
      canNavigateToSaleWorkspaceStep({
        currentStep: 0,
        readiness,
        sale: { ...draft, status: "pending" },
        targetStep: 3,
      }),
    ).toBe(true);
  });

  it("reports every required fact for an enabled, incomplete trade-in", () => {
    expect(getTradeInSnapshotMissingFields({ enabled: true })).toEqual([
      "Valor de avaliação da troca",
      "Marca do veículo da troca",
      "Modelo do veículo da troca",
      "Placa do veículo da troca",
      "Ano de fabricação da troca",
      "Ano modelo da troca",
      "Cor do veículo da troca",
      "Chassi do veículo da troca",
      "Renavam do veículo da troca",
    ]);
  });

  it("gates closing when the trade payment is missing or the principal exceeds the price", () => {
    const sale = saleRecord({
      payments: [{ ...payment(), principalCents: 100001 }],
      saleSourceSnapshot: { source: "lead", tradeIn: validTradeIn() },
    });

    expect(getSaleCloseMissingFields(sale)).toEqual(
      expect.arrayContaining([
        "Pagamento da troca",
        "Total principal excede o preço da venda",
      ]),
    );
    expect(getSaleWorkspaceStepReadiness(sale)[1]?.missingFields).toEqual(
      expect.arrayContaining([
        "Pagamento da troca",
        "Total principal excede o preço da venda",
      ]),
    );
  });

  it("accepts a catalog-backed trade-in whose linked payment matches valuation", () => {
    const sale = saleRecord({
      payments: [
        {
          ...payment(),
          metadata: { methodReference: "Honda · Civic · ABC1D23" },
          method: "trade_in",
        },
      ],
      saleSourceSnapshot: {
        source: "lead",
        tradeIn: {
          ...validTradeIn(),
          brand: null,
          catalog: {
            brandName: "Honda",
            modelName: "Civic",
            modelYear: 2024,
          },
          model: null,
          yearModel: null,
        },
      },
    });

    expect(getSaleCloseMissingFields(sale)).not.toEqual(
      expect.arrayContaining([
        "Marca do veículo da troca",
        "Modelo do veículo da troca",
        "Pagamento da troca",
        "Valor da parcela de troca",
      ]),
    );
  });

  it("rejects duplicate active trade-in payments from legacy or imported drafts", () => {
    const tradePayment = {
      ...payment(),
      method: "trade_in" as const,
    };
    const sale = saleRecord({
      payments: [tradePayment, { ...tradePayment, id: "payment_2" }],
      saleSourceSnapshot: { source: "lead", tradeIn: validTradeIn() },
    });

    expect(getSaleCloseMissingFields(sale)).toContain(
      "Pagamento duplicado da troca",
    );
  });
});

function validTradeIn(): Record<string, unknown> {
  return {
    brand: "Honda",
    chassi: "9BWZZZ377VT004251",
    color: "preto",
    enabled: true,
    model: "Civic",
    plate: "ABC1D23",
    renavam: "12345678901",
    valuationCents: 100000,
    yearFabrication: 2023,
    yearModel: 2024,
  };
}

function saleRecord(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    buyerSnapshot: validBuyerSnapshot(),
    closedAt: null,
    correctionOfSaleId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    documentPolicySnapshot: {
      requiredDocumentKinds: ["sale_contract", "sale_receipt"],
    },
    id: "sale_1",
    isCurrentRevision: true,
    leadId: "lead_1",
    listingId: null,
    listingSnapshot: {
      chassi: "9BWZZZ377VT004251",
      renavam: "12345678901",
      title: "Audi A4",
    },
    overrideReason: null,
    overrideRequiredFields: false,
    payments: [payment()],
    revision: 1,
    salePriceCents: 100000,
    saleSourceSnapshot: { source: "lead" },
    selectedDocumentKinds: ["sale_contract", "sale_receipt"],
    sellerUserId: "seller_1",
    status: "draft",
    unitId: "unit_1",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function validBuyerSnapshot(): Record<string, unknown> {
  return {
    address: "Rua das Flores, 100",
    city: "São Paulo",
    document: "52998224725",
    estadoCivil: "solteiro",
    name: "Cliente QA",
    nacionalidade: "brasileira",
    profissao: "comerciante",
    state: "SP",
  };
}

function payment(): SaleRecord["payments"][number] {
  return {
    amountCents: 100000,
    dueAt: "2026-01-15",
    extraCents: 0,
    id: "payment_1",
    installments: null,
    metadata: {},
    method: "pix",
    paidAt: null,
    principalCents: 100000,
    providerPaymentId: null,
    status: "pending",
  };
}
