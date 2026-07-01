import { describe, expect, it, vi } from "vitest";
import { VehicleUnitNotFoundError } from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import {
  createInventoryTestApp,
  createInventoryTestServices,
  expectApiError,
} from "./vehicle.controller.testSupport.js";

describe("inventory cost routes", () => {
  it("maps missing vehicle unit cost allocation to a not found response", async () => {
    const services = createInventoryTestServices();
    vi.mocked(services.addVehicleCost).mockRejectedValue(
      new VehicleUnitNotFoundError("unit_missing"),
    );
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/units/unit_missing/costs",
      {
        body: JSON.stringify({
          amountCents: 120000,
          kind: "preparation",
        }),
        method: "POST",
      },
    );

    expect(response.status).toBe(404);
    await expectApiError(response, {
      code: "INVENTORY_NOT_FOUND",
      message: "Vehicle unit not found: unit_missing",
    });
  });
});
