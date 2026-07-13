import { describe, expect, it } from "vitest";
import type { VehicleSalePayment } from "../ports/vehicleSalesRepository.js";
import {
  appendVehicleDocumentVoidHistory,
  buildReservationReceiptDocument,
  buildSoldDocuments,
} from "./vehicleWorkflowDocuments.js";
import {
  buyer,
  listing,
  sale,
  salePayment,
  template,
  unit,
} from "./vehicleWorkflowDocuments.testFixtures.js";
import { interpolateWorkflowTemplateClause } from "./vehicleWorkflowTemplateVariables.js";

describe("vehicle workflow documents", () => {
  it("applies customized template titles to generated records", () => {
    const reservation = buildReservationReceiptDocument({
      buyer,
      listing,
      sale,
      signalPayment: salePayment,
      template: template("reservation_receipt", "Sinal customizado"),
      unit,
    });
    const sold = buildSoldDocuments({
      buyer,
      listing,
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
      sale,
      selectedDocumentKinds: ["sale_contract", "delivery_term"],
      unit,
    });

    expect(sold.map((document) => document.kind)).toEqual([
      "sale_contract",
      "delivery_term",
    ]);
  });

  it("uses the gross signal allocation in the reservation receipt", () => {
    const document = buildReservationReceiptDocument({
      buyer,
      listing,
      sale,
      signalPayment: {
        ...salePayment,
        amountCents: 125000,
        extraCents: 25000,
        principalCents: 100000,
      },
      unit,
    });

    expect(document.metadata).toMatchObject({
      finance: {
        signalAmountCents: 125000,
        totalAmountCents: 12690000,
      },
    });
  });

  it("appends safe sale-reversion provenance to document history", () => {
    const at = new Date("2026-07-12T12:00:00.000Z");

    expect(
      appendVehicleDocumentVoidHistory(
        {
          operationHistory: [
            { action: "issued", actorId: "user_1", at },
            { malformed: true },
          ],
          saleId: "sale_1",
        },
        { actorId: "user_2", at, reason: "Sale correction" },
      ),
    ).toEqual({
      operationHistory: [
        { action: "issued", actorId: "user_1", at },
        {
          action: "voided",
          actorId: "user_2",
          at,
          reason: "Sale correction",
        },
      ],
      saleId: "sale_1",
    });
  });

  it("describes every active allocation and excludes inactive payments", () => {
    const paidPayment = {
      ...salePayment,
      amountCents: 5000000,
      principalCents: 5000000,
    };
    const pendingPayment: VehicleSalePayment = {
      ...salePayment,
      amountCents: 7690000,
      dueAt: new Date("2026-08-01T12:00:00.000Z"),
      id: "payment_2",
      method: "financing",
      paidAt: null,
      principalCents: 7690000,
      status: "pending",
    };
    const cancelledPayment: VehicleSalePayment = {
      ...salePayment,
      amountCents: 9990000,
      id: "payment_3",
      method: "cash",
      principalCents: 9990000,
      status: "cancelled",
    };

    const [document] = buildSoldDocuments({
      buyer,
      listing,
      sale: {
        ...sale,
        payments: [paidPayment, pendingPayment, cancelledPayment],
      },
      selectedDocumentKinds: ["sale_receipt"],
      unit,
    });

    expect(document?.metadata).toMatchObject({
      finance: {
        allocatedAmountCents: 12690000,
        paidAmountCents: 5000000,
        paymentMethod: "pix, financing",
        payments: [
          expect.objectContaining({
            amountCents: 5000000,
            id: "payment_1",
            method: "pix",
            status: "paid",
          }),
          expect.objectContaining({
            amountCents: 7690000,
            id: "payment_2",
            method: "financing",
            status: "pending",
          }),
        ],
      },
      salePaymentIds: ["payment_1", "payment_2"],
    });
  });
});
