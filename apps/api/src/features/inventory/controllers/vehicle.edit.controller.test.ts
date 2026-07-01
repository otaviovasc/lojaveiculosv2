import { describe, expect, it, vi } from "vitest";
import { VehicleUnitNotFoundError } from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import {
  createInventoryTestApp,
  createInventoryTestServices,
  expectApiError,
} from "./vehicle.controller.testSupport.js";

describe("inventory canonical edit routes", () => {
  it("wires canonical listing edits to the service boundary", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request("/api/v1/inventory/listings/listing_1", {
      body: JSON.stringify({
        description: "Updated canonical description",
        priceCents: 12100000,
        status: "published",
        title: "Fiat Toro Volcano",
      }),
      method: "PATCH",
    });

    expect(response.status).toBe(200);
    expect(services.updateListingDetails).toHaveBeenCalledWith(
      expect.any(Object),
      {
        description: "Updated canonical description",
        listingId: "listing_1",
        priceCents: 12100000,
        status: "published",
        title: "Fiat Toro Volcano",
      },
    );
  });

  it("wires canonical unit edits to the service boundary", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request("/api/v1/inventory/units/unit_1", {
      body: JSON.stringify({
        plate: "DEF4G56",
        status: "inactive",
        stockNumber: "stock_2",
        vin: "vin_2",
      }),
      method: "PATCH",
    });

    expect(response.status).toBe(200);
    expect(services.updateListingUnit).toHaveBeenCalledWith(
      expect.any(Object),
      {
        plate: "DEF4G56",
        status: "inactive",
        stockNumber: "stock_2",
        unitId: "unit_1",
        vin: "vin_2",
      },
    );
  });

  it("allows in-preparation unit edits through validation", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request("/api/v1/inventory/units/unit_1", {
      body: JSON.stringify({ status: "in_preparation" }),
      method: "PATCH",
    });

    expect(response.status).toBe(200);
    expect(services.updateListingUnit).toHaveBeenCalledWith(
      expect.any(Object),
      {
        status: "in_preparation",
        unitId: "unit_1",
      },
    );
  });

  it("maps vehicle unit not found failures", async () => {
    const services = createInventoryTestServices();
    vi.mocked(services.updateListingUnit).mockRejectedValue(
      new VehicleUnitNotFoundError("unit_missing"),
    );
    const app = createInventoryTestApp(services);

    const response = await app.request("/api/v1/inventory/units/unit_missing", {
      body: JSON.stringify({ plate: "DEF4G56" }),
      method: "PATCH",
    });

    expect(response.status).toBe(404);
    await expectApiError(response, {
      code: "INVENTORY_NOT_FOUND",
      message: "Vehicle unit not found: unit_missing",
    });
  });
});
