import { describe, expect, it, vi } from "vitest";
import { createAgencyApi } from "./apiClient";

describe("createAgencyApi", () => {
  it("requests and cancels Z-API for the selected managed store", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ contract: { status: "scheduled" } }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
    ) as typeof fetch;
    const api = createAgencyApi({ fetch: fetchMock });

    await api.requestStoreZapi("tenant_1", "store_1");
    await api.cancelStoreZapiRequest("tenant_1", "store_1");

    const endpoint =
      "/api/v1/agency/tenants/tenant_1/stores/store_1/billing/addons/zapi/request";
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      endpoint,
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      endpoint,
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("calls browser fetch with the global context", async () => {
    const fetchMock = vi.fn(function (
      this: unknown,
      _input: RequestInfo | URL,
      _init?: RequestInit,
    ) {
      if (this !== globalThis) throw new TypeError("Illegal invocation");
      return Promise.resolve(
        new Response(JSON.stringify({ stores: [], tenantId: "tenant_1" }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      );
    }) as typeof fetch;
    const api = createAgencyApi({ fetch: fetchMock });

    await expect(api.getOverview("tenant_1")).resolves.toMatchObject({
      stores: [],
      tenantId: "tenant_1",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/agency/tenants/tenant_1/overview",
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("creates tenant checkout sessions through the agency billing endpoint", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ checkoutUrl: "https://asaas.test" }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
    ) as typeof fetch;
    const api = createAgencyApi({ fetch: fetchMock });

    await api.createCheckout("tenant_1", {
      billingTypes: ["CREDIT_CARD"],
      minutesToExpire: 90,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/agency/tenants/tenant_1/billing/provider/checkout",
      expect.objectContaining({
        body: JSON.stringify({
          billingTypes: ["CREDIT_CARD"],
          minutesToExpire: 90,
        }),
        method: "POST",
      }),
    );
  });

  it("saves the initial CRM and Z-API selection for the managed store", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ storeId: "store_1" }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
    ) as typeof fetch;
    const api = createAgencyApi({ fetch: fetchMock });

    await api.updateStoreSelection("tenant_1", "store_1", {
      addonIds: ["addon_crm", "addon_zapi"],
      planId: "plan_1",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/agency/tenants/tenant_1/stores/store_1/billing/selection",
      expect.objectContaining({
        body: JSON.stringify({
          addonIds: ["addon_crm", "addon_zapi"],
          planId: "plan_1",
        }),
        method: "PUT",
      }),
    );
  });
});
