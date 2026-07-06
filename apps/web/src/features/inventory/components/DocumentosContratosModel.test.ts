import { describe, expect, it } from "vitest";
import { listingDetailPayload } from "../api/apiClientTestSupport";
import type { InventoryDocument, InventoryListingDetail } from "../model/types";
import {
  createContractForm,
  validateContractForm,
} from "./DocumentosContratosModel";
import {
  buildContractPreviewData,
  createContractDocumentItems,
} from "./DocumentosContratosData";
import type { InventoryStoreSettings } from "./InventoryPrintTypes";

describe("documentos contratos model", () => {
  it("prefills vehicle price, selected unit and store settings", () => {
    const form = createContractForm(createDetail(), createStoreSettings());

    expect(form.unitId).toBe("unit_1");
    expect(form.salePrice).toContain("120.000,00");
    expect(form.storeName).toBe("Loja Teste");
    expect(form.storeDocument).toBe("12.345.678/0001-90");
    expect(form.storeCity).toBe("Sao Paulo");
  });

  it("asks for sale contract fields before generating a preview", () => {
    const form = {
      ...createContractForm(createDetail(), createStoreSettings()),
      buyerName: "Maria Cliente",
    };

    expect(validateContractForm(form)).toEqual([
      "CPF/CNPJ do comprador",
      "Endereco do comprador",
    ]);
  });

  it("asks for reservation-specific fields for reserve receipts", () => {
    const form = {
      ...createContractForm(createDetail(), createStoreSettings()),
      buyerDocument: "123.456.789-00",
      buyerName: "Maria Cliente",
      reservationExpiresAt: "",
      signalAmount: "",
      templateId: "reservation_receipt" as const,
    };

    expect(validateContractForm(form)).toContain("Valor do sinal");
    expect(validateContractForm(form)).toContain("Validade da reserva");
    expect(validateContractForm(form)).not.toContain("Valor de venda");
  });

  it("builds print data from the selected unit and form fields", () => {
    const detail = createDetail();
    const form = {
      ...createContractForm(detail, createStoreSettings()),
      buyerAddress: "Rua Cliente, 10",
      buyerDocument: "123.456.789-00",
      buyerName: "Maria Cliente",
      salePrice: "R$ 130.000,00",
      unitId: "unit_2",
    };

    const data = buildContractPreviewData(detail, form);

    expect(data.buyer.name).toBe("Maria Cliente");
    expect(data.salePrice).toBe(130000);
    expect(data.vehicle.plate).toBe("DEF2E34");
    expect(data.vehicle.color).toBe("Preto");
    expect(data.store.nome).toBe("Loja Teste");
  });

  it("lists only contract and receipt documents", () => {
    const items = createContractDocumentItems(
      [
        createDocument("sale_contract", "signed", "Contrato assinado"),
        createDocument("invoice", "issued", "Nota fiscal"),
      ],
      [],
    );

    expect(items).toEqual([
      {
        date: "01/01/2026",
        id: "doc-sale_contract",
        status: "Assinado",
        title: "Contrato assinado",
      },
    ]);
  });
});

function createDetail() {
  const base = listingDetailPayload();

  return {
    ...base,
    documents: [],
    listing: {
      ...base.listing,
      catalog: {
        brandCode: "59",
        brandLogoUrl: null,
        brandName: "Honda",
        fipeCode: "001",
        fuel: "Flex",
        modelCode: "123",
        modelName: "Civic",
        modelYear: 2026,
        priceCents: 12000000,
        referenceMonth: "julho/2026",
        source: "fipe",
        vehicleType: "cars",
        yearCode: "2026-1",
        yearName: "2026 Flex",
      },
      manufactureYear: 2025,
      mileageKm: 12000,
      modelYear: 2026,
      trimName: "Touring",
    },
    units: [
      {
        ...base.units[0],
        id: "unit_1",
        plate: "ABC1D23",
      },
      {
        ...base.units[0],
        colorName: "black",
        id: "unit_2",
        plate: "DEF2E34",
        vin: "9BWZZZ377VT004251",
      },
    ],
  } as unknown as InventoryListingDetail;
}

function createStoreSettings(): InventoryStoreSettings {
  return {
    identity: {
      primaryDomain: null,
      tradingName: "Loja Teste",
    },
    profile: {
      addressCity: "Sao Paulo",
      addressLine1: "Av. Brasil, 1000",
      addressLine2: "Sala 12",
      addressState: "SP",
      contactPhone: "(11) 3333-4444",
      documentNumber: "12.345.678/0001-90",
      logoImageUrl: null,
      whatsappPhone: null,
    },
    publicSite: null,
  };
}

function createDocument(
  kind: InventoryDocument["kind"],
  status: InventoryDocument["status"],
  title: string,
): InventoryDocument {
  return {
    createdAt: "2026-01-01T12:00:00.000Z",
    fileName: `${kind}.pdf`,
    fileSizeBytes: null,
    id: `doc-${kind}`,
    kind,
    linkRole: "primary",
    metadata: {},
    mimeType: "application/pdf",
    status,
    storageKey: `documents/${kind}.pdf`,
    storeId: "store_1",
    targetId: "unit_1",
    targetType: "vehicle_unit",
    tenantId: "tenant_1",
    title,
    updatedAt: "2026-01-01T12:00:00.000Z",
    uploadedAt: "2026-01-01T12:00:00.000Z",
  };
}
