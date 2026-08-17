import { describe, expect, it } from "vitest";
import {
  createInventoryTestApp,
  createInventoryTestServices,
} from "./vehicle.controller.testSupport.js";

describe("inventory listing catalog validation", () => {
  it("rejects incomplete FIPE identities before calling create listing", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request("/api/v1/inventory/listings", {
      body: JSON.stringify({
        catalog: {
          brandCode: null,
          brandName: "Volvo",
          fipeCode: "029039-4",
          fuel: "Gasolina",
          modelCode: null,
          modelName: "V40 T-4 2.0 Aut./Mec.",
          modelYear: 2013,
          priceCents: 6552600,
          referenceMonth: "agosto de 2026",
          source: "fipe",
          vehicleType: "cars",
          yearCode: null,
          yearName: "2013 Gasolina",
        },
        plate: "AXD9H38",
        title: "Volvo V40 T-4 2.0 Aut./Mec. 2013",
      }),
      method: "POST",
    });

    expect(response.status).toBe(400);
    expect(services.createListing).not.toHaveBeenCalled();
  });
});
