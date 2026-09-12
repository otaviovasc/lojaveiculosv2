import { describe, expect, it } from "vitest";
import { buildSoldDocuments } from "./vehicleWorkflowDocuments.js";
import {
  buyer,
  listing,
  sale,
  salePayment,
  unit,
} from "./vehicleWorkflowDocuments.testFixtures.js";

describe("vehicle workflow document payments", () => {
  it("uses the payment method reference as the document description fallback", () => {
    const [document] = buildSoldDocuments({
      buyer,
      listing,
      sale: {
        ...sale,
        payments: [
          {
            ...salePayment,
            metadata: { methodReference: "NSU 123456" },
          },
        ],
      },
      selectedDocumentKinds: ["sale_receipt"],
      unit,
    });

    expect(document?.metadata).toMatchObject({
      finance: {
        payments: [expect.objectContaining({ description: "NSU 123456" })],
      },
    });
  });

  it("bridges the sale trade-in snapshot into document payment metadata", () => {
    const tradeInVehicle = {
      brand: "Honda",
      chassi: "93HFC1630KZ123456",
      color: "Prata",
      enabled: true,
      model: "Civic",
      plate: "ABC1D23",
      renavam: "12345678901",
      valuationCents: 4_000_000,
      yearFabrication: 2020,
      yearModel: 2021,
    };
    const [document] = buildSoldDocuments({
      buyer,
      listing,
      sale: {
        ...sale,
        payments: [
          {
            ...salePayment,
            amountCents: 4_000_000,
            metadata: { methodReference: "Honda Civic ABC1D23" },
            method: "trade_in",
            principalCents: 4_000_000,
          },
        ],
        sale: {
          ...sale.sale,
          saleSourceSnapshot: { tradeIn: tradeInVehicle },
        },
      },
      selectedDocumentKinds: ["power_of_attorney"],
      unit,
    });

    expect(document?.metadata).toMatchObject({
      finance: {
        payments: [
          expect.objectContaining({
            description: "Honda Civic ABC1D23",
            tradeInVehicle,
          }),
        ],
      },
      tradeInVehicle,
    });
  });
});
