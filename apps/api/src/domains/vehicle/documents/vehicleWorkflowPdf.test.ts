import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import React from "react";
import type { CreateVehicleDocumentRecord } from "../ports/vehicleInventoryRepository.js";
import {
  BUYER_ACKNOWLEDGMENT_ITEMS,
  createBuyerAcknowledgmentDocument,
} from "./vehicleBuyerAcknowledgmentPdf.js";
import { buildWorkflowPdfModel } from "./vehicleWorkflowPdfModel.js";
import { renderWorkflowDocumentPdf } from "./vehicleWorkflowPdf.js";
import {
  interpolateWorkflowTemplateClause,
  WorkflowTemplateVariableResolutionError,
} from "./vehicleWorkflowTemplateVariables.js";

describe("vehicle workflow pdf", () => {
  it("builds the document model with interpolated template clauses", () => {
    const model = buildWorkflowPdfModel(record);

    expect(model.title).toBe("Contrato customizado");
    expect(model.buyer.name).toBe("Ana Cliente");
    expect(model.buyer.documentLabel).toBe("CPF");
    expect(model.clauses[0]).toContain(
      "Loja Veículos vende para Ana Cliente o Fiat Toro Volcano 2023",
    );
    expect(model.clauses[0]).toContain("R$");
    expect(model.vehicle.plate).toBe("ABC1D23");
    expect(model.vehicle.chassi).toBe("9BD00000000000000");
    expect(model.finance.payments[0]).toMatchObject({
      method: "pix",
      valueCents: 12690000,
    });
  });

  it("maps enriched vehicle, buyer and finance metadata when present", () => {
    const model = buildWorkflowPdfModel({
      ...record,
      metadata: {
        ...record.metadata,
        buyer: {
          ...buyerMetadata,
          cep: "13045-678",
          city: "Campinas",
          district: "Jardim das Acácias",
          state: "SP",
        },
        finance: {
          ...financeMetadata,
          discountCents: 500000,
          tablePriceCents: 13190000,
        },
        sellerName: "Marcos Vendedor",
        transfer: { crvName: "Ana Cliente", status: "PAGO_PELA_LOJA" },
        vehicle: {
          ...vehicleMetadata,
          color: "Branco",
          fuelType: "flex",
          km: 38500,
          renavam: "01234567890",
        },
        witnesses: ["Testemunha Um", "Testemunha Dois"],
      },
    });

    expect(model.buyer.city).toBe("Campinas");
    expect(model.buyer.cep).toBe("13045-678");
    expect(model.vehicle.color).toBe("Branco");
    expect(model.vehicle.fuel).toBe("Flex");
    expect(model.vehicle.km).toBe(38500);
    expect(model.vehicle.renavam).toBe("01234567890");
    expect(model.finance.tablePriceCents).toBe(13190000);
    expect(model.sellerName).toBe("Marcos Vendedor");
    expect(model.transfer?.statusLabel).toBe("Pago pela Loja");
    expect(model.witnesses).toEqual(["Testemunha Um", "Testemunha Dois"]);
  });

  it("derives the trade-in vehicle from the trade-in payment metadata", () => {
    const model = buildWorkflowPdfModel({
      ...record,
      metadata: {
        ...record.metadata,
        finance: {
          ...financeMetadata,
          payments: [
            {
              amountCents: 4490000,
              method: "trade_in",
              paidAt: "2026-07-20T14:30:00",
              tradeInVehicle: {
                brand: "HONDA",
                chassi: "93HFC1630KZ123456",
                model: "CIVIC",
                plate: "FZK-4E78",
                renavam: "00987654321",
                yearFabrication: 2019,
                yearModel: 2019,
              },
            },
          ],
        },
      },
    });

    expect(model.tradeInVehicle).toMatchObject({
      brand: "HONDA",
      chassi: "93HFC1630KZ123456",
      model: "CIVIC",
      plate: "FZK-4E78",
      renavam: "00987654321",
    });
  });

  it("fails closed when a customized clause contains an unresolved token", () => {
    expect(() =>
      interpolateWorkflowTemplateClause("Cliente {{unknown.value}}", {}),
    ).toThrow(WorkflowTemplateVariableResolutionError);
  });

  it.each([
    "sale_contract",
    "sale_receipt",
    "delivery_term",
    "power_of_attorney",
    "buyer_acknowledgment",
    "reservation_receipt",
  ] as const)("renders %s as PDF bytes", async (kind) => {
    const pdf = await renderWorkflowDocumentPdf({ ...record, kind });

    expect(Buffer.from(pdf.subarray(0, 4)).toString("utf8")).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(1000);
    const document = await PDFDocument.load(pdf);
    expect(document.getTitle()).toBe("Contrato customizado");
    expect(document.getAuthor()).toBe("Loja Veículos");
    expect(document.getCreator()).toBe("Loja Veículos OS");
  });

  it("lists every acknowledgment item in the buyer checklist document", () => {
    const model = buildWorkflowPdfModel({
      ...record,
      kind: "buyer_acknowledgment",
    });
    const document = createBuyerAcknowledgmentDocument(model);
    const text = collectPdfText(document).join(" ");

    expect(BUYER_ACKNOWLEDGMENT_ITEMS).toHaveLength(9);
    for (const item of BUYER_ACKNOWLEDGMENT_ITEMS) {
      expect(text).toContain(item.replace(/:$/, ""));
    }
    expect(text).toContain("TERMO DE RECEBIMENTO DE DOCUMENTOS E ITENS");
    expect(text).toContain("Ana Cliente");
    expect(text).toContain("ABC1D23");
  });
});

function collectPdfText(node: unknown): string[] {
  if (typeof node === "string") return [node];
  if (Array.isArray(node)) return node.flatMap(collectPdfText);
  if (React.isValidElement(node)) {
    return collectPdfText((node.props as { children?: unknown }).children);
  }
  return [];
}

const buyerMetadata = {
  address: "Rua A",
  document: "123.456.789-00",
  email: "ana@example.com",
  name: "Ana Cliente",
  phone: "11999999999",
};

const financeMetadata = {
  paymentMethod: "PIX",
  payments: [
    {
      amountCents: 12690000,
      description: "Entrada via PIX",
      method: "pix",
      paidAt: "2026-07-18T10:15:00",
      status: "paid",
    },
  ],
  salePriceCents: 12690000,
  signalAmountCents: 500000,
};

const vehicleMetadata = {
  manufactureYear: 2022,
  modelYear: 2023,
  plate: "ABC1D23",
  title: "Fiat Toro Volcano 2023",
  unitId: "unit_1",
  vin: "9BD00000000000000",
};

const record: CreateVehicleDocumentRecord = {
  createdByUserId: "user_1",
  fileName: "sale-contract.pdf",
  fileSizeBytes: null,
  kind: "sale_contract",
  linkRole: "sale_contract",
  metadata: {
    buyer: buyerMetadata,
    finance: financeMetadata,
    saleId: "sale_1",
    salePaymentId: "payment_1",
    store: { name: "Loja Veículos" },
    templateClauses: [
      "{{store.name}} vende para {{buyer.name}} o {{vehicle.title}} por {{finance.salePrice}}.",
    ],
    templateTitle: "Contrato customizado",
    vehicle: vehicleMetadata,
  },
  mimeType: "application/pdf",
  status: "issued",
  storageKey: "generated/vehicle-workflows/unit_1/sale-contract.pdf",
  storeId: "store_1",
  targetId: "unit_1",
  targetType: "vehicle_unit",
  tenantId: "tenant_1",
  title: "Contrato customizado - Ana Cliente",
};
