import { describe, expect, it } from "vitest";
import type { DocumentTemplate } from "../../documents/ports/documentRepository.js";
import type {
  VehicleBuyerSnapshot,
  VehicleSaleBundle,
} from "../ports/vehicleSalesRepository.js";
import type {
  VehicleListing,
  VehicleUnit,
} from "../ports/vehicleInventoryRepository.js";
import {
  buildReservationReceiptDocument,
  buildSoldDocuments,
} from "./vehicleWorkflowDocuments.js";
import { interpolateWorkflowTemplateClause } from "./vehicleWorkflowTemplateVariables.js";

describe("vehicle workflow documents", () => {
  it("applies customized template titles to generated records", () => {
    const reservation = buildReservationReceiptDocument({
      buyer,
      listing,
      paymentMethod: "PIX",
      sale,
      signalAmountCents: 500000,
      template: template("reservation_receipt", "Sinal customizado"),
      unit,
    });
    const sold = buildSoldDocuments({
      buyer,
      listing,
      paymentMethod: "PIX",
      sale,
      templates: new Map([
        ["sale_contract", template("sale_contract", "Contrato customizado")],
      ]),
      unit,
    });

    expect(reservation.title).toBe("Sinal customizado - Ana Cliente");
    expect(sold[0]?.title).toBe("Contrato customizado - Ana Cliente");
  });

  it("interpolates supported template variables server-side", () => {
    expect(
      interpolateWorkflowTemplateClause(
        "Comprador {{buyer.name}} comprou {{vehicle.title}} por {{finance.salePrice}}.",
        {
          "{{buyer.name}}": "Ana Cliente",
          "{{finance.salePrice}}": "R$ 126.900,00",
          "{{vehicle.title}}": "Fiat Toro Volcano 2023",
        },
      ),
    ).toBe(
      "Comprador Ana Cliente comprou Fiat Toro Volcano 2023 por R$ 126.900,00.",
    );
  });

  it("treats customer-provided token-like text as literal content", () => {
    expect(
      interpolateWorkflowTemplateClause(
        "Comprador {{buyer.name}} adquiriu {{vehicle.title}}.",
        {
          "{{buyer.name}}": "Cliente {{vehicle.title}}",
          "{{vehicle.title}}": "Fiat Toro",
        },
      ),
    ).toBe("Comprador Cliente {{vehicle.title}} adquiriu Fiat Toro.");
  });

  it("builds only the selected sale document bundle", () => {
    const sold = buildSoldDocuments({
      buyer,
      listing,
      paymentMethod: "PIX",
      sale,
      selectedDocumentKinds: ["sale_contract", "delivery_term"],
      unit,
    });

    expect(sold.map((document) => document.kind)).toEqual([
      "sale_contract",
      "delivery_term",
    ]);
  });
});

function template(
  kind: DocumentTemplate["kind"],
  title: string,
): DocumentTemplate {
  return {
    availableVariables: ["{{buyer.name}}"],
    blocks: [
      {
        body: "Comprador {{buyer.name}}",
        id: "clause_1",
        type: "clause",
      },
    ],
    category: "Legal",
    clauses: ["Comprador {{buyer.name}}"],
    context: "sale",
    defaultBlocks: [
      {
        body: "Comprador {{buyer.name}}",
        id: "clause_1",
        type: "clause",
      },
    ],
    defaultClauses: ["Comprador {{buyer.name}}"],
    defaultTitle: title,
    description: "Modelo de teste",
    isCustomized: true,
    kind,
    mode: "editable",
    source: "store",
    templateKey: kind,
    title,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

const buyer: VehicleBuyerSnapshot = {
  address: "Rua A",
  document: "000.000.000-00",
  email: "ana@example.com",
  name: "Ana Cliente",
  phone: "11999999999",
};

const listing = {
  catalog: null,
  id: "listing_1",
  manufactureYear: 2022,
  modelYear: 2023,
  plate: "ABC1D23",
  priceCents: 12690000,
  storeId: "store_1",
  tenantId: "tenant_1",
  title: "Fiat Toro Volcano 2023",
  trimName: "Volcano",
} as VehicleListing;

const unit = {
  id: "unit_1",
  plate: "ABC1D23",
  vin: "9BD00000000000000",
} as VehicleUnit;

const sale = {
  payment: {
    amountCents: 12690000,
    id: "payment_1",
  },
  sale: {
    id: "sale_1",
    salePriceCents: 12690000,
  },
} as VehicleSaleBundle;
