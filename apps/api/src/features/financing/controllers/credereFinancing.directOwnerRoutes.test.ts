import { describe, expect, it, vi } from "vitest";
import {
  createAgencyApp,
  createServices,
  createStoreApp,
  storeId,
  tenantId,
} from "./credereFinancing.controller.testSupport.js";

describe("Credere direct owner financing routes", () => {
  it("lets direct store owners discover their own Credere provider stores", async () => {
    const services = createServices({
      agency: {
        listProviderStores: vi.fn(async () => ({
          stores: [{ externalStoreId: "external_1", name: "Credere Store" }],
        })),
      },
    });
    const agencyResponse = await createAgencyApp(services).request(
      `/api/v1/agency/tenants/${tenantId}/financing/credere/provider-stores`,
    );
    const storeResponse = await createDirectOwnerApp(services).request(
      "/api/v1/financing/credere/provider-stores",
    );

    expect(agencyResponse.status).toBe(200);
    expect(storeResponse.status).toBe(200);
    expect(services.agency.listProviderStores).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: null, tenantId }),
    );
    expect(services.agency.listProviderStores).toHaveBeenCalledWith(
      expect.objectContaining({ storeId, tenantId }),
    );
    expect(await storeResponse.json()).toEqual({
      stores: [{ externalStoreId: "external_1", name: "Credere Store" }],
    });
  });

  it("restricts direct owner connection overview to the current store mapping", async () => {
    const services = createServices({
      agency: {
        getConnection: vi.fn(async () => connectionWithSiblingMappings()),
      },
    });

    const response = await createDirectOwnerApp(services).request(
      "/api/v1/financing/credere/connection",
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      configured: true,
      connected: true,
      connection: {
        connected: true,
        connectedAt: "2026-07-27T10:00:00.000Z",
        status: "connected",
      },
      storeMapping: {
        externalStoreAlias: "Current Credere",
        externalStoreId: "external_current",
        storeId,
      },
    });
  });

  it("rejects forged local store ids when direct owners map", async () => {
    const services = createServices({
      agency: { upsertStoreMapping: vi.fn() },
    });
    const response = await createDirectOwnerApp(services).request(
      "/api/v1/financing/credere/store-mapping",
      {
        body: JSON.stringify({
          externalStoreId: "external_1",
          storeId: "store_sibling",
        }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      },
    );

    expect(response.status).toBe(400);
    expect(services.agency.upsertStoreMapping).not.toHaveBeenCalled();
  });

  it("passes the current store id when direct owners map", async () => {
    const services = createServices({
      agency: {
        upsertStoreMapping: vi.fn(async () => ({
          externalStoreId: "external_1",
          storeId,
        })),
      },
    });
    const response = await createDirectOwnerApp(services).request(
      "/api/v1/financing/credere/store-mapping",
      {
        body: JSON.stringify({ externalStoreId: "external_1" }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      },
    );

    expect(response.status).toBe(200);
    expect(services.agency.upsertStoreMapping).toHaveBeenCalledWith(
      expect.objectContaining({ storeId, tenantId }),
      { externalStoreId: "external_1", storeId },
    );
  });

  it("denies direct connection controls to agency-managed store owners", async () => {
    const services = createServices();
    const response = await createStoreApp(services, {
      billingManagedBy: "agency",
      membershipRole: "owner",
    }).request("/api/v1/financing/credere/provider-stores");

    expect(response.status).toBe(403);
    expect(services.agency.listProviderStores).not.toHaveBeenCalled();
  });

  it("denies direct connection controls to non-owner store users", async () => {
    const services = createServices();
    const response = await createStoreApp(services, {
      billingManagedBy: "store_owner",
      membershipRole: "salesman",
    }).request("/api/v1/financing/credere/provider-stores");

    expect(response.status).toBe(403);
    expect(services.agency.listProviderStores).not.toHaveBeenCalled();
  });

  it("fails closed when direct owner context lacks connection permission", async () => {
    const services = createServices();
    const response = await createStoreApp(services, {
      billingManagedBy: "store_owner",
      membershipRole: "owner",
      permissions: ["financing.simulation.read"],
    }).request("/api/v1/financing/credere/provider-stores");

    expect(response.status).toBe(403);
    expect(services.agency.listProviderStores).not.toHaveBeenCalled();
  });
});

function createDirectOwnerApp(services: ReturnType<typeof createServices>) {
  return createStoreApp(services, {
    billingManagedBy: "store_owner",
    membershipRole: "owner",
  });
}

function connectionWithSiblingMappings() {
  return {
    accessToken: "secret",
    connected: true,
    connectedAt: new Date("2026-07-27T10:00:00.000Z"),
    scopes: ["simulator", "proposals"],
    status: "connected",
    storeMappings: [
      {
        externalStoreAlias: "Current Credere",
        externalStoreId: "external_current",
        storeId,
      },
      {
        externalStoreAlias: "Sibling Credere",
        externalStoreId: "external_sibling",
        storeId: "store_sibling",
      },
    ],
  };
}
