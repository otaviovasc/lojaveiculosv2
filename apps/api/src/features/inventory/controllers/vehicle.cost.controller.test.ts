import { describe, expect, it, vi } from "vitest";
import { VehicleCostMissingUnitError } from "../../../domains/vehicle/services/VehicleService/addVehicleCost.js";
import {
  createInventoryTestApp,
  createInventoryTestServices,
} from "./vehicle.controller.testSupport.js";

describe("inventory cost routes", () => {
  it("maps missing vehicle unit cost allocation to a validation response", async () => {
    const services = createInventoryTestServices();
    vi.mocked(services.addVehicleCost).mockRejectedValue(
      new VehicleCostMissingUnitError("listing_1"),
    );
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/listings/listing_1/costs",
      {
        body: JSON.stringify({
          amountCents: 120000,
          kind: "preparation",
        }),
        method: "POST",
      },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      message: "Vehicle listing has no unit for cost allocation: listing_1",
    });
  });
});
