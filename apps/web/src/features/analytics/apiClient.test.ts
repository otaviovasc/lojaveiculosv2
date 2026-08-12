import { describe, expect, it, vi } from "vitest";
import { createAnalyticsApi } from "./apiClient";

describe("analytics api client", () => {
  it("keeps home and analytics requests on separate routes", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            generatedAt: "2026-06-22T17:00:00.000Z",
            inventory: {
              averagePriceCents: 12000000,
              availableListings: 4,
              reservedListings: 1,
              soldListings: 2,
              totalListings: 7,
            },
            kpis: [],
            leadFunnel: [],
            leadSources: [],
            revenue: {
              closedSalesCents: 24000000,
              grossMarginCents: 0,
              openReceivablesCents: 100000,
              paidReceiptsCents: 0,
            },
            storeId: "store_1",
            tenantId: "tenant_1",
          }),
        ),
    );

    const api = createAnalyticsApi({
      auth: { clerkUserId: "clerk_1", storeSlug: "test-store" },
      fetch,
    });

    await api.getHomeDashboard();
    const dashboard = await api.getDashboard({
      from: "2026-06-01",
      to: "2026-06-30",
    });

    expect(fetch.mock.calls[0]?.[0]).toBe("/api/v1/analytics/home");
    expect(fetch.mock.calls[0]?.[1]?.headers).toMatchObject({
      "x-clerk-user-id": "clerk_1",
      "x-store-slug": "test-store",
    });
    expect(fetch.mock.calls[1]?.[0]).toBe(
      "/api/v1/analytics/dashboard?from=2026-06-01&to=2026-06-30",
    );
    expect(dashboard.storeId).toBe("store_1");
  });
});
