import { describe, expect, it } from "vitest";
import { toCredereSimulationInput } from "./runtimeCredereSimulationInput.js";

describe("runtime Credere simulation input", () => {
  it("derives the financed amount from price minus down payment", () => {
    const result = toCredereSimulationInput(simulationPayload(), "idem_1");

    expect(result.amountCents).toBe(4_000_000);
    expect(result.vehicle).toMatchObject({
      credereVehicleModelId: "model_1",
      licensingUf: "SP",
      vehicleMolicarCode: "01906108-0",
    });
  });

  it.each(["licensingUf", "molicarCode"] as const)(
    "rejects a missing vehicle %s instead of inventing provider data",
    (field) => {
      const payload = simulationPayload();
      delete (payload.vehicle as Partial<typeof payload.vehicle>)[field];

      expect(() => toCredereSimulationInput(payload, "idem_1")).toThrow(
        `vehicle.${field} is required`,
      );
    },
  );
});

function simulationPayload() {
  return {
    applicant: {
      document: "52998224725",
      name: "Buyer Test",
      phone: "11988887777",
    },
    consent: { creditSimulation: true, personalData: true },
    terms: {
      downPaymentCents: 1_000_000,
      installmentCount: 48,
      requestedBankCodes: ["655"],
    },
    vehicle: {
      licensingCity: "Sao Paulo",
      licensingUf: "SP",
      credereVehicleModelId: "model_1",
      manufactureYear: 2022,
      modelYear: 2023,
      molicarCode: "01906108-0",
      priceCents: 5_000_000,
      zeroKm: false,
    },
  };
}
