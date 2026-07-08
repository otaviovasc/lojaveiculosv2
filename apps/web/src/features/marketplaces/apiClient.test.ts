import { describe, expect, it, vi } from "vitest";
import { createMarketplaceApi } from "./apiClient";

describe("createMarketplaceApi", () => {
  it("calls marketplace overview and stock sync routes", async () => {
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
    await api.previewStockSync("olx", {
      provider: "olx",
    });
    await api.runStockSync("olx", {
      batchId: "batch_1",
      provider: "olx",
    });
    await api.retrySyncJob("job_1", {
      reason: "retry_from_test",
    });

    expect(fetch.mock.calls[0]?.[0]).toBe("/api/v1/marketplaces/overview");
    expect(fetch.mock.calls[0]?.[1]?.headers).toMatchObject({
      "x-store-slug": "loja-centro",
    });
    expect(fetch.mock.calls[1]?.[0]).toBe(
      "/api/v1/marketplaces/integrations/olx/stock-sync/preview",
    );
    expect(fetch.mock.calls[1]?.[1]?.method).toBe("POST");
    expect(fetch.mock.calls[2]?.[0]).toBe(
      "/api/v1/marketplaces/integrations/olx/stock-sync/run",
    );
    expect(fetch.mock.calls[3]?.[0]).toBe(
      "/api/v1/marketplaces/sync-jobs/job_1/retry",
    );
  });
});
