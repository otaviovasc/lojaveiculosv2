import { describe, expect, it, vi } from "vitest";
import { createAgencyApi } from "./apiClient";

describe("createAgencyApi", () => {
  it("creates and polls a store-scoped plan hire", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: "hire_1" }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
    ) as typeof fetch;
    const api = createAgencyApi({ fetch: fetchMock });
    await api.createStorePlanHire("tenant_1", "store_1", {
      idempotencyKey: "agency-hire-1",
      planId: "83262608-0000-4000-8000-000000000002",
    });
    await api.getStorePlanHire("tenant_1", "store_1", "hire_1");
    const base =
      "/api/v1/agency/tenants/tenant_1/stores/store_1/billing/plan-hires";
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      base,
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${base}/hire_1`,
      expect.any(Object),
    );
  });

  it("requests an Escala quote for the selected store", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: "quote_1" }), {
          headers: { "content-type": "application/json" },
          status: 201,
        }),
    ) as typeof fetch;
    const api = createAgencyApi({ fetch: fetchMock });
    await api.requestStorePlanQuote(
      "tenant_1",
      "store_1",
      "83262608-0000-4000-8000-000000000005",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/agency/tenants/tenant_1/stores/store_1/billing/plan-quotes",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("calls browser fetch with the global context", async () => {
    const fetchMock = vi.fn(function (this: unknown) {
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
  });
});
