import { describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "../../../shared/authorization.js";
import {
  createServiceContext,
  type ServiceContext,
} from "../../../shared/serviceContext.js";
import { VehicleListingNotFoundError } from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import {
  createInventoryTestApp,
  createInventoryTestServices,
} from "./vehicle.controller.testSupport.js";

type ListingDetailBody = {
  listing?: { id?: string };
  status?: string;
};

describe("inventory listing routes", () => {
  it("wires create listing requests to the service boundary", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request("/api/v1/inventory/listings", {
      body: JSON.stringify({ plate: "ABC1D23", title: "Fiat Toro" }),
      method: "POST",
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as ListingDetailBody;
    expect(body.listing?.id).toBe("listing_1");
    expect(body.status).toBe("ready");
    expect(services.createListing).toHaveBeenCalledWith(expect.any(Object), {
      plate: "ABC1D23",
      title: "Fiat Toro",
    });
  });

  it("wires description updates to the planned service name", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/listings/listing_1/description",
      {
        body: JSON.stringify({ description: "Updated description" }),
        method: "PATCH",
      },
    );

    expect(response.status).toBe(200);
    expect(services.updateListingDescription).toHaveBeenCalledWith(
      expect.any(Object),
      {
        description: "Updated description",
        listingId: "listing_1",
      },
    );
  });

  it("wires price updates to the planned service name", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/listings/listing_1/price",
      {
        body: JSON.stringify({ priceCents: 12000000 }),
        method: "PATCH",
      },
    );

    expect(response.status).toBe(200);
    expect(services.updateListingPrice).toHaveBeenCalledWith(
      expect.any(Object),
      {
        listingId: "listing_1",
        priceCents: 12000000,
      },
    );
  });

  it("wires unit attachment to the planned service name", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/listings/listing_1/unit",
      {
        body: JSON.stringify({ stockNumber: "stock_1", vin: "vin_1" }),
        method: "PUT",
      },
    );

    expect(response.status).toBe(200);
    expect(services.attachListingUnit).toHaveBeenCalledWith(
      expect.any(Object),
      {
        listingId: "listing_1",
        stockNumber: "stock_1",
        vin: "vin_1",
      },
    );
  });

  it("wires status changes to the planned service name", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/listings/listing_1/status",
      {
        body: JSON.stringify({ status: "available" }),
        method: "PATCH",
      },
    );

    expect(response.status).toBe(200);
    expect(services.changeListingStatus).toHaveBeenCalledWith(
      expect.any(Object),
      {
        listingId: "listing_1",
        status: "available",
      },
    );
  });

  it("wires vehicle costs to the planned service name", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/listings/listing_1/costs",
      {
        body: JSON.stringify({
          amountCents: 120000,
          description: "Preparacao",
          kind: "preparation",
          unitId: "unit_1",
        }),
        method: "POST",
      },
    );

    expect(response.status).toBe(201);
    expect(services.addVehicleCost).toHaveBeenCalledWith(expect.any(Object), {
      amountCents: 120000,
      description: "Preparacao",
      kind: "preparation",
      listingId: "listing_1",
      unitId: "unit_1",
    });
  });

  it("maps validation failures before calling services", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request("/api/v1/inventory/listings", {
      body: JSON.stringify({ title: "" }),
      method: "POST",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      message: "Request body is invalid.",
    });
    expect(services.createListing).not.toHaveBeenCalled();
  });

  it("maps authorization failures from services", async () => {
    const services = createInventoryTestServices();
    vi.mocked(services.getListing).mockRejectedValue(
      new AuthorizationError("Missing permission: inventory.read"),
    );
    const app = createInventoryTestApp(services);

    const response = await app.request("/api/v1/inventory/listings/listing_1");

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      message: "Missing permission: inventory.read",
    });
  });

  it("maps vehicle listing not found failures", async () => {
    const services = createInventoryTestServices();
    vi.mocked(services.getListing).mockRejectedValue(
      new VehicleListingNotFoundError("listing_missing"),
    );
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/listings/listing_missing",
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      message: "Vehicle listing not found: listing_missing",
    });
  });

  it("passes authenticated service context into listing services", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    await app.request("/api/v1/inventory/listings/listing_1", {
      headers: { "x-request-id": "req_1" },
    });

    const [[serviceContext]] = vi.mocked(services.getListing).mock.calls as [
      [ServiceContext, unknown],
    ];

    expect(serviceContext.requestId).toBe("req_1");
    expect(serviceContext.actor).toEqual({ id: "user_1", kind: "user" });
    expect(serviceContext.storeId).toBe("store_1");
    expect(serviceContext.tenantId).toBe("tenant_1");
  });

  it("rejects public context for protected inventory routes", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services, async () =>
      createServiceContext({ request: { requestId: "req_public" } }),
    );

    const response = await app.request("/api/v1/inventory/listings/listing_1");

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      message:
        "Inventory routes require authenticated user or integration context.",
    });
    expect(services.getListing).not.toHaveBeenCalled();
  });
});
