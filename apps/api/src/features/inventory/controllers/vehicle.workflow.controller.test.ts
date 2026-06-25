import { describe, expect, it, vi } from "vitest";
import {
  VehicleWorkflowStateError,
  VehicleWorkflowValidationError,
} from "../../../domains/vehicle/services/VehicleService/reserveVehicleListing.js";
import {
  createInventoryTestApp,
  createInventoryTestServices,
} from "./vehicle.controller.testSupport.js";

describe("inventory workflow routes", () => {
  it("wires reservation workflow requests to the service boundary", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/listings/listing_1/reserve",
      {
        body: JSON.stringify({
          buyer: { name: "Buyer" },
          paymentMethod: "pix",
          signalAmountCents: 100000,
          unitId: "unit_1",
        }),
        method: "POST",
      },
    );

    expect(response.status).toBe(201);
    expect(services.reserveListing).toHaveBeenCalledWith(expect.any(Object), {
      buyer: {
        address: null,
        document: null,
        email: null,
        name: "Buyer",
        phone: null,
      },
      listingId: "listing_1",
      paymentMethod: "pix",
      signalAmountCents: 100000,
      unitId: "unit_1",
    });
  });

  it("wires sale workflow requests to the service boundary", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/listings/listing_1/sell",
      {
        body: JSON.stringify({
          buyer: { document: "000", name: "Buyer" },
          paymentMethod: "pix",
          unitId: "unit_1",
        }),
        method: "POST",
      },
    );

    expect(response.status).toBe(201);
    expect(services.sellListing).toHaveBeenCalledWith(expect.any(Object), {
      buyer: {
        address: null,
        document: "000",
        email: null,
        name: "Buyer",
        phone: null,
      },
      listingId: "listing_1",
      paymentMethod: "pix",
      unitId: "unit_1",
    });
  });

  it("maps workflow validation errors to 400 responses", async () => {
    const services = createInventoryTestServices();
    vi.mocked(services.sellListing).mockRejectedValueOnce(
      new VehicleWorkflowValidationError("salePriceCents"),
    );
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/listings/listing_1/sell",
      {
        body: JSON.stringify({
          buyer: { name: "Buyer" },
          paymentMethod: "pix",
          unitId: "unit_1",
        }),
        method: "POST",
      },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      message: "Vehicle workflow requires salePriceCents",
    });
  });

  it("maps workflow state conflicts to 409 responses", async () => {
    const services = createInventoryTestServices();
    vi.mocked(services.reserveListing).mockRejectedValueOnce(
      new VehicleWorkflowStateError(
        "Vehicle listing must be available to reserve; current status is sold.",
      ),
    );
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/listings/listing_1/reserve",
      {
        body: JSON.stringify({
          buyer: { name: "Buyer" },
          paymentMethod: "pix",
          signalAmountCents: 100000,
          unitId: "unit_1",
        }),
        method: "POST",
      },
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      message:
        "Vehicle listing must be available to reserve; current status is sold.",
    });
  });
});
