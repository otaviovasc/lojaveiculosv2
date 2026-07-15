import { describe, expect, it, vi } from "vitest";
import { createBillingApi } from "./apiClient";

describe("createBillingApi", () => {
  it("persists a server-priced plan and add-on selection", async () => {
    const fetch = vi.fn().mockResolvedValue({
      json: async () => ({ plans: [] }),
      ok: true,
    });
    const api = createBillingApi({ fetch: fetch as never });

    await api.updateSelection({ addonIds: ["addon-1"], planId: "plan-1" });

    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/billing/selection",
      expect.objectContaining({
        body: JSON.stringify({ addonIds: ["addon-1"], planId: "plan-1" }),
        method: "PUT",
      }),
    );
  });

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

  it("syncs a mid-cycle selection without rewriting pending charges", async () => {
    const fetch = vi.fn().mockResolvedValue({
      json: async () => ({ status: "active" }),
      ok: true,
    });
    const api = createBillingApi({ fetch: fetch as never });

    await api.syncProviderSubscription({
      billingType: "CREDIT_CARD",
      nextDueDate: "2026-08-01",
      updatePendingPayments: false,
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/billing/provider/subscription/sync",
      expect.objectContaining({
        body: JSON.stringify({
          billingType: "CREDIT_CARD",
          nextDueDate: "2026-08-01",
          updatePendingPayments: false,
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
