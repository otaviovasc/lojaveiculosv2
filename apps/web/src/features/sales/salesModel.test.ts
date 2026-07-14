/* @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import {
  canPersistSaleWorkspaceEdits,
  createDraftFromContext,
  parseSaleStartContext,
  paymentPrincipalTotal,
  reservationSignalPayment,
  saleMissingFields,
} from "./salesModel";
import type { SaleRecord } from "./types";

describe("sales model start context", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("propagates vehicle media and identifiers into draft creation", () => {
    const mediaUrl = "https://cdn.example.com/vehicles/civic.jpg";
    window.location.hash =
      `#/sales?leadId=lead_1&listingId=listing_1&unitId=unit_1` +
      `&listingTitle=${encodeURIComponent("Honda Civic Touring")}` +
      `&unitLabel=EST-42&placa=TRD1E23&cor=Preto` +
      `&primaryMediaUrl=${encodeURIComponent(mediaUrl)}&priceCents=12990000`;

    const context = parseSaleStartContext();
    const draft = createDraftFromContext(context);

    expect(context).toMatchObject({
      colorName: "Preto",
      leadId: "lead_1",
      listingId: "listing_1",
      plate: "TRD1E23",
      primaryMediaUrl: mediaUrl,
      unitId: "unit_1",
    });
    expect(draft).toMatchObject({
      documentPolicySnapshot: { requiredDocumentKinds: [] },
      leadId: "lead_1",
      listingId: "listing_1",
      listingSnapshot: {
        colorName: "Preto",
        plate: "TRD1E23",
        primaryMediaUrl: mediaUrl,
        title: "Honda Civic Touring",
        unitLabel: "EST-42",
      },
      salePriceCents: 12990000,
      saleSourceSnapshot: {
        commission: { enabled: false, ruleType: "percentage" },
        documentation: { hasLien: null, status: "pending" },
        financing: { rank: "R1", status: "pending" },
        insurance: {
          appliedCommissionPercentage: 10,
          status: "pending",
        },
        source: "lead_or_vehicle_workspace",
      },
      selectedDocumentKinds: [
        "sale_contract",
        "sale_receipt",
        "delivery_term",
        "power_of_attorney",
      ],
      unitId: "unit_1",
    });
  });

  it("uses only active allocations for coverage and the reservation signal", () => {
    const sale = saleRecord({
      payments: [
        payment("cancelled", "cancelled", 7000000),
        payment("signal", "pending", 125000),
        payment("refunded", "refunded", 8000000),
      ],
    });

    expect(paymentPrincipalTotal(sale)).toBe(125000);
    expect(reservationSignalPayment(sale)?.id).toBe("signal");
    expect(saleMissingFields(sale, "reserve")).not.toContain(
      "Sinal de reserva",
    );
    expect(saleMissingFields(sale, "close")).toContain("Pagamentos");
  });

  it("never exposes a historical revision as editable", () => {
    expect(
      canPersistSaleWorkspaceEdits(
        saleRecord({ isCurrentRevision: false, status: "draft" }),
      ),
    ).toBe(false);
    expect(
      canPersistSaleWorkspaceEdits(
        saleRecord({ isCurrentRevision: true, status: "draft" }),
      ),
    ).toBe(true);
  });

  it("blocks close when terminal service states lack accounting facts", () => {
    const sale = saleRecord({
      payments: [payment("cash", "paid", 5000000)],
      saleSourceSnapshot: {
        documentation: { status: "charged" },
        financing: { status: "approved" },
        insurance: { status: "issued" },
      },
    });

    expect(saleMissingFields(sale, "close")).toEqual(
      expect.arrayContaining([
        "Pagamento de financiamento",
        "Valor da documentação",
        "Gravame da documentação",
        "Prêmio do seguro",
        "Percentual de comissão do seguro",
      ]),
    );
  });

  it("accepts close when terminal service states include accounting facts", () => {
    const sale = saleRecord({
      payments: [
        payment("financing", "pending", 5000000, { method: "financing" }),
      ],
      saleSourceSnapshot: {
        documentation: {
          chargedAmountCents: 150000,
          hasLien: false,
          status: "charged",
        },
        financing: { status: "approved" },
        insurance: {
          appliedCommissionPercentage: 10,
          premiumCents: 100000,
          status: "issued",
        },
      },
    });

    expect(saleMissingFields(sale, "close")).toEqual([]);
  });

  it("requires a positive accounting amount on active financing lines", () => {
    const sale = saleRecord({
      payments: [
        payment("cash", "paid", 5000000),
        payment("financing", "pending", 0, { method: "financing" }),
      ],
      saleSourceSnapshot: { financing: { status: "approved" } },
    });

    expect(saleMissingFields(sale, "close")).toContain("Valor financiado");
  });
});

function saleRecord(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    buyerSnapshot: { name: "Cliente QA" },
    closedAt: null,
    correctionOfSaleId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    documentPolicySnapshot: { requiredDocumentKinds: [] },
    id: "sale_1",
    isCurrentRevision: true,
    leadId: "lead_1",
    listingId: "listing_1",
    listingSnapshot: {},
    overrideReason: null,
    overrideRequiredFields: false,
    payments: [],
    revision: 1,
    salePriceCents: 5000000,
    saleSourceSnapshot: {},
    selectedDocumentKinds: [],
    sellerUserId: "seller_1",
    status: "draft",
    unitId: "unit_1",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function payment(
  id: string,
  status: SaleRecord["payments"][number]["status"],
  principalCents: number,
  overrides: Partial<SaleRecord["payments"][number]> = {},
): SaleRecord["payments"][number] {
  return {
    amountCents: principalCents,
    dueAt: null,
    extraCents: 0,
    id,
    installments: null,
    metadata: {},
    method: "pix",
    paidAt: null,
    principalCents,
    providerPaymentId: null,
    status,
    ...overrides,
  };
}
