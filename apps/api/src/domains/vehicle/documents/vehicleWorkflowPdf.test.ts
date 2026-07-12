import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import type { CreateVehicleDocumentRecord } from "../ports/vehicleInventoryRepository.js";
import { buildWorkflowPdfContent } from "./vehicleWorkflowPdfContent.js";
import { renderWorkflowDocumentPdf } from "./vehicleWorkflowPdf.js";
import {
  interpolateWorkflowTemplateClause,
  WorkflowTemplateVariableResolutionError,
} from "./vehicleWorkflowTemplateVariables.js";

describe("vehicle workflow pdf", () => {
  it("builds polished document content with interpolated template clauses", () => {
    const content = buildWorkflowPdfContent(record);

    expect(content.title).toBe("Contrato customizado");
    expect(content.buyer.fields).toContainEqual({
      label: "Comprador",
      value: "Ana Cliente",
    });
    expect(content.buyer.fields).toContainEqual({
      label: "Telefone",
      value: "(11) 99999-9999",
    });
    expect(content.clauses[0]).toContain(
      "Loja Veículos vende para Ana Cliente o Fiat Toro Volcano 2023",
    );
    expect(content.clauses[0]).toContain("R$");
    expect(
      content.audit.fields.map((field) => field.value).join(" "),
    ).not.toContain("sale_1");
    expect(
      content.vehicle.fields.map((field) => field.value).join(" "),
    ).not.toContain("unit_1");
  });

  it("fails closed when a customized clause contains an unresolved token", () => {
    expect(() =>
      interpolateWorkflowTemplateClause("Cliente {{unknown.value}}", {}),
    ).toThrow(WorkflowTemplateVariableResolutionError);
  });

  it("renders workflow documents as PDF bytes", async () => {
    const pdf = await renderWorkflowDocumentPdf(record);

    expect(Buffer.from(pdf.subarray(0, 4)).toString("utf8")).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(1000);
    const document = await PDFDocument.load(pdf);
    expect(document.getTitle()).toBe("Contrato customizado");
    expect(document.getAuthor()).toBe("Loja Veículos");
    expect(document.getCreator()).toBe("Loja Veículos OS");
    expect(document.getSubject()).toContain("Contrato de compra e venda");
  });

  it.each([
    ["reservation_receipt", "R$ 5.000,00"],
    ["sale_receipt", "R$ 126.900,00"],
  ] as const)("states the amount on %s documents", (kind, amount) => {
    const content = buildWorkflowPdfContent({ ...record, kind });
    expect(content.finance.fields).toContainEqual({
      label: "Valor do recibo",
      value: amount,
    });
  });
});

const record: CreateVehicleDocumentRecord = {
  createdByUserId: "user_1",
  fileName: "sale-contract.pdf",
  fileSizeBytes: null,
  kind: "sale_contract",
  linkRole: "sale_contract",
  metadata: {
    buyer: {
      address: "Rua A",
      document: "123.456.789-00",
      email: "ana@example.com",
      name: "Ana Cliente",
      phone: "11999999999",
    },
    finance: {
      paymentMethod: "PIX",
      salePriceCents: 12690000,
      signalAmountCents: 500000,
    },
    saleId: "sale_1",
    salePaymentId: "payment_1",
    templateClauses: [
      "{{store.name}} vende para {{buyer.name}} o {{vehicle.title}} por {{finance.salePrice}}.",
    ],
    templateTitle: "Contrato customizado",
    vehicle: {
      manufactureYear: 2022,
      modelYear: 2023,
      plate: "ABC1D23",
      title: "Fiat Toro Volcano 2023",
      unitId: "unit_1",
      vin: "9BD00000000000000",
    },
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
