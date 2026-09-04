import { describe, expect, it, vi } from "vitest";
import { VehicleUnitNotFoundError } from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import {
  VehicleCostFinanceEntryDuplicateError,
  VehicleCostStateError,
} from "../../../domains/vehicle/vehicleCostErrors.js";
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

  it("routes cost corrections with the unit and cost scope", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);
    const response = await app.request(
      "/api/v1/inventory/units/unit_1/costs/cost_1",
      {
        body: JSON.stringify({
          amountCents: 95000,
          costDate: "2026-02-03T12:00:00.000Z",
          description: "Pintura corrigida",
          kind: "repair",
        }),
        method: "PATCH",
      },
    );

    expect(response.status).toBe(200);
    expect(services.updateVehicleCost).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        amountCents: 95000,
        costId: "cost_1",
        unitId: "unit_1",
      }),
    );
  });

  it("requires a meaningful reason before routing a cost void", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);
    const response = await app.request(
      "/api/v1/inventory/units/unit_1/costs/cost_1/void",
      {
        body: JSON.stringify({ reason: "x" }),
        method: "POST",
      },
    );

    expect(response.status).toBe(400);
    expect(services.voidVehicleCost).not.toHaveBeenCalled();
    await expectApiError(response, {
      code: "REQUEST_VALIDATION_ERROR",
      message: "Request body is invalid.",
    });
  });

  it("maps a concurrent cost void to a conflict response", async () => {
    const services = createInventoryTestServices();
    vi.mocked(services.voidVehicleCost).mockRejectedValue(
      new VehicleCostStateError(),
    );
    const app = createInventoryTestApp(services);
    const response = await app.request(
      "/api/v1/inventory/units/unit_1/costs/cost_1/void",
      {
        body: JSON.stringify({ reason: "Lançamento duplicado" }),
        method: "POST",
      },
    );

    expect(response.status).toBe(409);
    await expectApiError(response, {
      code: "VEHICLE_COST_CONFLICT",
      message: "Vehicle cost is no longer active.",
    });
  });

  it("maps ambiguous finance links to a cost conflict response", async () => {
    const services = createInventoryTestServices();
    vi.mocked(services.updateVehicleCost).mockRejectedValue(
      new VehicleCostFinanceEntryDuplicateError("cost_1"),
    );
    const app = createInventoryTestApp(services);
    const response = await app.request(
      "/api/v1/inventory/units/unit_1/costs/cost_1",
      {
        body: JSON.stringify({ amountCents: 95000, kind: "repair" }),
        method: "PATCH",
      },
    );

    expect(response.status).toBe(409);
    await expectApiError(response, {
      code: "VEHICLE_COST_CONFLICT",
      message: "Multiple finance entries reference vehicle cost: cost_1",
    });
  });
});
