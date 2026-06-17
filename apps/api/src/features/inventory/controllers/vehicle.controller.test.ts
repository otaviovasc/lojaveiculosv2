import { describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "../../../shared/authorization.js";
import {
  createServiceContext,
  type ServiceContext,
} from "../../../shared/serviceContext.js";
import {
  createInventoryTestApp,
  createInventoryTestServices,
  scaffoldResult,
} from "./vehicle.controller.testSupport.js";

describe("inventory listing routes", () => {
  it("wires create listing requests to the service boundary", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request("/api/v1/inventory/listings", {
      body: JSON.stringify({ plate: "ABC1D23", title: "Fiat Toro" }),
      method: "POST",
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(scaffoldResult());
    expect(services.createListing).toHaveBeenCalledWith(expect.any(Object), {
      plate: "ABC1D23",
      title: "Fiat Toro",
    });
  });

  it("wires get listing requests to the service boundary", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request("/api/v1/inventory/listings/listing_1");

    expect(response.status).toBe(200);
    expect(services.getListing).toHaveBeenCalledWith(expect.any(Object), {
      listingId: "listing_1",
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
      message: "Inventory routes require authenticated user context.",
    });
    expect(services.getListing).not.toHaveBeenCalled();
  });
});
