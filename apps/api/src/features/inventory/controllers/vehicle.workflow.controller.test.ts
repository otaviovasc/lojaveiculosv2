import { describe, expect, it, vi } from "vitest";
import {
  VehicleWorkflowStateError,
  VehicleWorkflowValidationError,
} from "../../../domains/vehicle/workflows/vehicleSaleWorkflowRules.js";
import {
  createInventoryTestApp,
  createInventoryTestServices,
} from "./vehicle.controller.testSupport.js";

describe("inventory workflow routes", () => {
  it("wires reservation workflow requests to the service boundary", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/units/unit_1/reserve",
      {
        body: JSON.stringify({
          buyer: { name: "Buyer" },
          paymentMethod: "pix",
          signalAmountCents: 100000,
        }),
        method: "POST",
      },
    );

    expect(response.status).toBe(201);
    expect(services.reserveUnit).toHaveBeenCalledWith(expect.any(Object), {
      buyer: {
        address: null,
        document: null,
        email: null,
        name: "Buyer",
        phone: null,
      },
      paymentMethod: "pix",
      signalAmountCents: 100000,
      unitId: "unit_1",
    });
  });

  it("wires sale workflow requests to the service boundary", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request("/api/v1/inventory/units/unit_1/sell", {
      body: JSON.stringify({
        buyer: { document: "000", name: "Buyer" },
        paymentMethod: "pix",
      }),
      method: "POST",
    });

    expect(response.status).toBe(201);
    expect(services.sellUnit).toHaveBeenCalledWith(expect.any(Object), {
      buyer: {
        address: null,
        document: "000",
        email: null,
        name: "Buyer",
        phone: null,
      },
      paymentMethod: "pix",
      unitId: "unit_1",
    });
  });

  it("wires reservation release requests to the service boundary", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/units/unit_1/reservation/release",
      {
        body: JSON.stringify({
          reason: "Cliente desistiu",
          saleId: "sale_1",
        }),
        method: "POST",
      },
    );

    expect(response.status).toBe(200);
    expect(services.releaseUnitReservation).toHaveBeenCalledWith(
      expect.any(Object),
      {
        outcome: "release",
        reason: "Cliente desistiu",
        saleId: "sale_1",
        unitId: "unit_1",
      },
    );
  });

  it.each([
    ["cancel", "/api/v1/inventory/units/unit_1/reservation/cancel"],
    ["expire", "/api/v1/inventory/units/unit_1/reservation/expire"],
  ] as const)(
    "wires reservation %s requests to the service boundary",
    async (outcome, path) => {
      const services = createInventoryTestServices();
      const app = createInventoryTestApp(services);

      const response = await app.request(path, {
        body: JSON.stringify({
          reason: "Prazo encerrado",
          saleId: "sale_1",
        }),
        method: "POST",
      });

      expect(response.status).toBe(200);
      expect(services.releaseUnitReservation).toHaveBeenCalledWith(
        expect.any(Object),
        {
          outcome,
          reason: "Prazo encerrado",
          saleId: "sale_1",
          unitId: "unit_1",
        },
      );
    },
  );

  it("maps workflow validation errors to 400 responses", async () => {
    const services = createInventoryTestServices();
    vi.mocked(services.sellUnit).mockRejectedValueOnce(
      new VehicleWorkflowValidationError("salePriceCents"),
    );
    const app = createInventoryTestApp(services);

    const response = await app.request("/api/v1/inventory/units/unit_1/sell", {
      body: JSON.stringify({
        buyer: { name: "Buyer" },
        paymentMethod: "pix",
      }),
      method: "POST",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      message: "Vehicle workflow requires salePriceCents",
    });
  });

  it("maps workflow state conflicts to 409 responses", async () => {
    const services = createInventoryTestServices();
    vi.mocked(services.reserveUnit).mockRejectedValueOnce(
      new VehicleWorkflowStateError(
        "Vehicle unit must be available to reserve; current status is sold.",
      ),
    );
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/units/unit_1/reserve",
      {
        body: JSON.stringify({
          buyer: { name: "Buyer" },
          paymentMethod: "pix",
          signalAmountCents: 100000,
        }),
        method: "POST",
      },
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      message:
        "Vehicle unit must be available to reserve; current status is sold.",
    });
  });
});
