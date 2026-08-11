// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createPrefillIdentity } from "./SimulationsReadyWorkspace";
import type { SimulationPrefill } from "./SimulationForm";

describe("createPrefillIdentity", () => {
  it("changes when any simulation prefill field changes", () => {
    const prefill: SimulationPrefill = {
      applicantName: "Ana Souza",
      channel: "store_workspace",
      cpfCnpj: "52998224725",
      credereVehicleModelId: "model_1",
      email: "ana@example.test",
      fipeCode: "005340-6",
      leadId: "lead_1",
      licensingCity: "Sao Paulo",
      licensingUf: "SP",
      listingId: "listing_1",
      manufactureYear: 2022,
      modelYear: 2023,
      molicarCode: "01906108-0",
      phone: "11987654321",
      unitId: "unit_1",
      vehicleValueCents: 5_000_000,
      zeroKm: false,
    };
    const baseIdentity = createPrefillIdentity(prefill);

    for (const key of Object.keys(prefill) as Array<keyof SimulationPrefill>) {
      expect(
        createPrefillIdentity({
          ...prefill,
          [key]: changedValueFor(key, prefill[key]),
        }),
      ).not.toBe(baseIdentity);
    }
  });
});

function changedValueFor(
  key: keyof SimulationPrefill,
  value: SimulationPrefill[keyof SimulationPrefill],
) {
  if (typeof value === "number") return value + 1;
  if (typeof value === "boolean") return !value;
  return `${String(value)}-${String(key)}`;
}
