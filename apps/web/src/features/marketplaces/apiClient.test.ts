import { describe, expect, it, vi } from "vitest";
import { createMarketplaceApi } from "./apiClient";

describe("createMarketplaceApi", () => {
  it("calls marketplace overview and sync job routes", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(
      async () =>
        new Response(JSON.stringify({ jobs: [], providers: ["olx"] }), {
          status: 200,
        }),
    );
    const api = createMarketplaceApi({
      auth: { clerkUserId: "clerk_1", storeSlug: "loja-centro" },
      fetch,
    });

    await api.getOverview();
    await api.createSyncJob("olx", {
      jobType: "inventory_sync",
      provider: "olx",
    });

    expect(fetch.mock.calls[0]?.[0]).toBe("/api/v1/marketplaces/overview");
    expect(fetch.mock.calls[0]?.[1]?.headers).toMatchObject({
      "x-store-slug": "loja-centro",
    });
    expect(fetch.mock.calls[1]?.[0]).toBe(
      "/api/v1/marketplaces/integrations/olx/sync-jobs",
    );
    expect(fetch.mock.calls[1]?.[1]?.method).toBe("POST");
  });
});
