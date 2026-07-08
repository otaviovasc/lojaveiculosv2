import { describe, expect, it, vi } from "vitest";
import { createAgencyApi } from "./apiClient";

describe("createAgencyApi", () => {
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
});
