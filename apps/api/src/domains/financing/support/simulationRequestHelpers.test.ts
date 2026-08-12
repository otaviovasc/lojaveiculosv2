import { describe, expect, it } from "vitest";
import { simulationInput } from "../services/FinancingService/testSupport.js";
import { buildCredereSimulationRequest } from "./simulationRequestHelpers.js";

describe("Credere simulation request", () => {
  it("builds one official provider condition per requested term", () => {
    const request = simulationInput({
      accessoryValueCents: 25_000,
      documentationValueCents: 15_000,
      installmentCounts: [24, 48],
      insuranceValueCents: 10_000,
    });

    expect(
      buildCredereSimulationRequest({
        bankCodes: ["655"],
        leadCpfCnpj: "52998224725",
        request,
        sellerCpf: "98765432100",
        vehicle: {
          ...request.vehicle,
          credereVehicleModelId: "model_1",
        },
      }),
    ).toMatchObject({
      accessoryValueCents: 25_000,
      conditions: [
        { financedAmountCents: 4_000_000, installments: 24 },
        { financedAmountCents: 4_000_000, installments: 48 },
      ],
      documentationValueCents: 15_000,
      insuranceValueCents: 10_000,
      processBankSuggestedConditions: true,
    });
  });
});
