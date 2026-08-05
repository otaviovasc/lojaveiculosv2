import { describe, expect, it, vi } from "vitest";
import { VehicleUnitIdentifierConflictError } from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import {
  createInventoryTestApp,
  createInventoryTestServices,
  expectApiError,
} from "./vehicle.controller.testSupport.js";

describe("inventory unit conflict response", () => {
  it("returns a stable conflict when a unit identifier already exists", async () => {
    const services = createInventoryTestServices();
    services.attachListingUnit = vi.fn(async () => {
      throw new VehicleUnitIdentifierConflictError("vin");
    });
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/listings/listing_1/unit",
      {
        body: JSON.stringify({ vin: "vin_1" }),
        method: "PUT",
      },
    );

    expect(response.status).toBe(409);
    await expectApiError(response, {
      code: "VEHICLE_UNIT_IDENTIFIER_CONFLICT",
      details: { field: "vin" },
      message: "A vehicle unit with this vin already exists in the store.",
    });
  });
});
