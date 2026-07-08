import { describe, expect, it, vi } from "vitest";
import { createBillingApi } from "./apiClient";

describe("createBillingApi", () => {
  it("creates hosted checkout sessions through the billing endpoint", async () => {
    const fetch = vi.fn().mockResolvedValue({
      json: async () => ({ checkoutUrl: "https://asaas.test/checkout" }),
      ok: true,
    });
    const api = createBillingApi({
      auth: { clerkUserId: "clerk_1", storeSlug: "loja-centro" },
      fetch: fetch as never,
    });

    await api.createCheckout({
      billingTypes: ["CREDIT_CARD", "PIX"],
      minutesToExpire: 90,
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/billing/provider/checkout",
      expect.objectContaining({
        body: JSON.stringify({
          billingTypes: ["CREDIT_CARD", "PIX"],
          minutesToExpire: 90,
        }),
        method: "POST",
      }),
    );
  });

  it("sends entitlement update reasons to the billing endpoint", async () => {
    const fetch = vi.fn().mockResolvedValue({
      json: async () => ({ entitlements: [] }),
      ok: true,
    });
    const api = createBillingApi({
      auth: { clerkUserId: "clerk_1", storeSlug: "loja-centro" },
      fetch: fetch as never,
    });

    await api.updateEntitlement("marketplace", {
      featureKey: "marketplace",
      reason: "Agency enabled OLX rollout.",
      status: "active",
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/billing/entitlements/marketplace",
      expect.objectContaining({
        body: JSON.stringify({
          featureKey: "marketplace",
          reason: "Agency enabled OLX rollout.",
          status: "active",
        }),
        method: "PATCH",
      }),
    );
  });
});
