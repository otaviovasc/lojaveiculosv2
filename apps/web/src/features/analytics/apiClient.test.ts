import { describe, expect, it, vi } from "vitest";
import { createAnalyticsApi } from "./apiClient";

describe("analytics api client", () => {
  it("reads the V2 analytics dashboard with local auth headers", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
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

    const dashboard = await api.getDashboard();

    expect(fetch.mock.calls[0]?.[0]).toBe("/api/v1/analytics/dashboard");
    expect(fetch.mock.calls[0]?.[1]?.headers).toMatchObject({
      "x-clerk-user-id": "clerk_1",
      "x-store-slug": "test-store",
    });
    expect(dashboard.storeId).toBe("store_1");
  });
});
