import { describe, expect, it } from "vitest";
import type { FinanceEntry } from "../finance/types";
import type { SaleRecord } from "../sales/types";
import {
  applyEntryToIssueDraft,
  applySaleToIssueDraft,
  computeIssueTotalCents,
  createEmptyIssueDraft,
  type FiscalIssueDraft,
} from "./fiscalIssueModel";
import {
  buildIssueDocumentInput,
  buildVehicleNfeMetadata,
  validateIssueDraft,
} from "./fiscalIssuePayload";

const VALID_CPF = "529.982.247-25";

function createSale(): SaleRecord {
  return {
    buyerSnapshot: {
      city: "Curitiba",
      document: VALID_CPF,
      email: "comprador@example.com",
      name: "Maria Compradora",
      phone: "41999998888",
      state: "PR",
    },
    closedAt: null,
    correctionOfSaleId: null,
    createdAt: "2026-07-01T12:00:00.000Z",
    documentPolicySnapshot: {},
    id: "sale_123",
    isCurrentRevision: true,
    leadId: null,
    listingId: "listing_1",
    listingSnapshot: {
      chassi: "9BWZZZ377VT004251",
      colorName: "Prata",
      manufactureYear: 2021,
      mileageKm: 45000,
      modelYear: 2022,
      plate: "ABC1D23",
      renavam: "12345678901",
      title: "Fiat Argo 1.0 Drive",
    },
    overrideReason: null,
    overrideRequiredFields: false,
    payments: [
      {
        amountCents: 1000000,
        dueAt: null,
        extraCents: 0,
        id: "pay_1",
        installments: null,
        metadata: {},
        method: "pix",
        paidAt: null,
        principalCents: 1000000,
        providerPaymentId: null,
        status: "paid",
      },
      {
        amountCents: 4000000,
        dueAt: null,
        extraCents: 0,
        id: "pay_2",
        installments: 24,
        metadata: {},
        method: "financing",
        paidAt: null,
        principalCents: 4000000,
        providerPaymentId: null,
        status: "pending",
      },
    ],
    revision: 1,
    salePriceCents: 5000000,
    saleSourceSnapshot: {},
    selectedDocumentKinds: [],
    sellerUserId: null,
    status: "closed",
    unitId: "unit_1",
    updatedAt: "2026-07-01T12:00:00.000Z",
  };
}

function createEntry(): FinanceEntry {
  return {
    amountCents: 250000,
    category: "MAINTENANCE",
    dueAt: null,
    id: "entry_9",
    name: "Revisão de entrega",
    paidAt: null,
    sellerUserId: null,
    status: "paid",
    type: "expense",
  };
}

function validNfeDraft(): FiscalIssueDraft {
  const draft = applySaleToIssueDraft(
    { ...createEmptyIssueDraft("nfe"), origin: "sale" },
    createSale(),
  );
  return draft;
}

describe("fiscalIssueModel sale mapping", () => {
  it("fills buyer, vehicle item, payments and reference from a sale", () => {
    const draft = validNfeDraft();

    expect(draft.externalReference).toBe("sale:sale_123");
    expect(draft.saleId).toBe("sale_123");
    expect(draft.recipient.name).toBe("Maria Compradora");
    expect(draft.recipient.document).toBe("529.982.247-25");
    expect(draft.recipient.city).toBe("Curitiba");
    expect(draft.items).toHaveLength(1);
    expect(draft.items[0]?.unitAmount).toBe(50000);
    expect(draft.items[0]?.description).toContain("Fiat Argo 1.0 Drive");
    expect(draft.items[0]?.description).toContain("Placa: ABC1D23");
    expect(draft.payments).toEqual([
      { amount: 10000, method: "pix" },
      { amount: 40000, method: "other" },
    ]);
  });

  it("prebuilds the vehicle block from the listing snapshot", () => {
    const draft = validNfeDraft();

    expect(draft.vehicle).toMatchObject({
      brand: "Fiat",
      chassis: "9BWZZZ377VT004251",
      color: "Prata",
      condition: "used",
      id: "listing_1",
      manufactureYear: 2021,
      model: "Argo 1.0 Drive",
      modelYear: 2022,
      odometer: 45000,
      plate: "ABC1D23",
      renavam: "12345678901",
      salePrice: 50000,
    });
  });
});

describe("fiscalIssueModel entry mapping", () => {
  it("maps an expense entry to a single item and reference", () => {
    const draft = applyEntryToIssueDraft(
      { ...createEmptyIssueDraft("nfe"), origin: "entry" },
      createEntry(),
    );

    expect(draft.externalReference).toBe("entry:entry_9");
    expect(draft.entryId).toBe("entry_9");
    expect(draft.saleId).toBeNull();
    expect(draft.items).toHaveLength(1);
    expect(draft.items[0]).toMatchObject({
      description: "Revisão de entrega",
      quantity: 1,
      unitAmount: 2500,
    });
  });
});

describe("fiscalIssueModel payload assembly", () => {
  it("builds metadata.vehicleNfe in the backend contract shape", () => {
    const input = buildIssueDocumentInput(validNfeDraft());

    expect(input.documentKind).toBe("nfe");
    expect(input.documentType).toBe("nfe_vehicle_sale");
    expect(input.externalReference).toBe("sale:sale_123");
    const vehicleNfe = input.metadata?.vehicleNfe as Record<
      string,
      Record<string, unknown>
    >;
    expect(vehicleNfe.buyer).toEqual({
      document: "52998224725",
      name: "Maria Compradora",
    });
    expect(vehicleNfe.sale).toEqual({ id: "sale_123", price: 50000 });
    expect(vehicleNfe.operation).toEqual({ type: "used_vehicle_sale" });
    expect(vehicleNfe.fiscal).toMatchObject({
      cfop: "5102",
      csosn: "102",
      ncm: "87032100",
      origin: "0",
    });
    expect(vehicleNfe.vehicle).toMatchObject({
      brand: "Fiat",
      model: "Argo 1.0 Drive",
      plate: "ABC1D23",
    });
  });

  it("includes tax rates only when informed", () => {
    const withRates = buildVehicleNfeMetadata({
      ...validNfeDraft(),
      fiscal: {
        ...validNfeDraft().fiscal,
        cst: "00",
        csosn: "",
        icmsRate: "12",
        cofinsRate: "7,6",
      },
    });

    expect(withRates.fiscal.cst).toBe("00");
    expect(withRates.fiscal.csosn).toBeUndefined();
    expect(withRates.fiscal.icms).toEqual({ rate: 12 });
    expect(withRates.fiscal.cofins).toEqual({ rate: 7.6 });
    expect(withRates.fiscal.ipi).toBeUndefined();
  });

  it("computes item totals with quantity and discount", () => {
    expect(
      computeIssueTotalCents([
        {
          cfop: "5102",
          description: "Veículo",
          discountAmount: 1000,
          ncm: "87032100",
          quantity: 1,
          unitAmount: 50000,
        },
        {
          cfop: "5102",
          description: "Acessório",
          discountAmount: 0,
          ncm: "87089990",
          quantity: 2,
          unitAmount: 250,
        },
      ]),
    ).toBe(4950000);
  });

  it("builds the NFS-e payload with template variables", () => {
    const input = buildIssueDocumentInput({
      ...createEmptyIssueDraft("nfse"),
      externalReference: "manual-comissao",
      nfse: {
        competence: "2026-07",
        grossAmount: "1.500,00",
        recipientId: "recipient_1",
        templateId: "template_1",
      },
    });

    expect(input.documentKind).toBe("nfse");
    expect(input.documentType).toBe("nfse_service_commission");
    expect(input.recipientId).toBe("recipient_1");
    expect(input.templateId).toBe("template_1");
    expect(input.metadata).toMatchObject({
      competence: "2026-07",
      grossAmount: 1500,
    });
    expect(input.templateVariables).toMatchObject({
      invoice: { grossAmount: 1500 },
      sale: { periodReference: "07/2026" },
    });
  });
});

describe("fiscalIssueModel validation", () => {
  it("accepts a complete sale-based NF-e draft", () => {
    const result = validateIssueDraft(validNfeDraft());
    expect(result.errors).toEqual({});
    expect(result.firstStep).toBeNull();
  });

  it("requires a selected sale for sale origin", () => {
    const result = validateIssueDraft({
      ...createEmptyIssueDraft("nfe"),
      origin: "sale",
    });
    expect(result.errors.origin).toBeDefined();
    expect(result.firstStep).toBe("origin");
  });

  it("requires an external reference for standalone emission", () => {
    const result = validateIssueDraft({
      ...validNfeDraft(),
      origin: "standalone",
      saleId: null,
      externalReference: "",
    });
    expect(result.errors.origin).toBeDefined();
  });

  it("rejects invalid buyer documents", () => {
    const draft = validNfeDraft();
    const result = validateIssueDraft({
      ...draft,
      recipient: { ...draft.recipient, document: "123" },
    });
    expect(result.errors.buyerDocument).toBeDefined();
    expect(result.firstStep).toBe("recipient");
  });

  it("requires vehicle identity and fiscal fields", () => {
    const draft = validNfeDraft();
    const result = validateIssueDraft({
      ...draft,
      fiscal: { ...draft.fiscal, cfop: "", csosn: "", cst: "" },
      vehicle: { ...draft.vehicle, brand: "", id: "" },
    });
    expect(result.errors.vehicle).toBeDefined();
    expect(result.firstStep).toBe("items");
  });

  it("requires chassis for new vehicles", () => {
    const draft = validNfeDraft();
    const result = validateIssueDraft({
      ...draft,
      vehicle: { ...draft.vehicle, chassis: "", condition: "new" },
    });
    expect(result.errors.vehicle).toContain("chassi");
  });

  it("requires template and amount for NFS-e", () => {
    const result = validateIssueDraft(createEmptyIssueDraft("nfse"));
    expect(result.errors.origin).toBeDefined();
    expect(result.errors.items).toBeDefined();
  });
});
