import { describe, expect, it, vi } from "vitest";
import { createBillingApi } from "./apiClient";

describe("createBillingApi", () => {
  it("creates a durable plan hire with the server-owned contract", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ json: async () => ({ id: "hire_1" }), ok: true });
    const api = createBillingApi({
      auth: { clerkUserId: "clerk_1", storeSlug: "loja" },
      fetch: fetch as never,
    });
    await api.createPlanHire({
      billingTypes: ["CREDIT_CARD"],
      idempotencyKey: "web-idempotency-1",
      planId: "83262608-0000-4000-8000-000000000002",
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/billing/plan-hires",
      expect.objectContaining({
        body: JSON.stringify({
          billingTypes: ["CREDIT_CARD"],
          idempotencyKey: "web-idempotency-1",
          planId: "83262608-0000-4000-8000-000000000002",
        }),
        method: "POST",
      }),
    );
  });

  it("polls a hire and requests an Escala quote without legacy selection routes", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ json: async () => ({ id: "result_1" }), ok: true });
    const api = createBillingApi({ fetch: fetch as never });
    await api.getPlanHire("hire_1");
    await api.requestPlanQuote("83262608-0000-4000-8000-000000000005");
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "/api/v1/billing/plan-hires/hire_1",
      expect.any(Object),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/v1/billing/plan-quotes",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetch.mock.calls.flat().join(" ")).not.toMatch(
      /selection|addons\/zapi|provider\/checkout/,
    );
  });

  it("preserves backend request IDs on errors", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "BILLING_UNAVAILABLE",
          message: "Unavailable",
          requestId: "req_123",
        }),
        { headers: { "content-type": "application/json" }, status: 503 },
      ),
    );
    const api = createBillingApi({ fetch: fetch as never });
    await expect(api.getOverview()).rejects.toMatchObject({
      requestId: "req_123",
    });
  });
});
