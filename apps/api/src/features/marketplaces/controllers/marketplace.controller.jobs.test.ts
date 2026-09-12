import { describe, expect, it } from "vitest";
import {
  connectAccount,
  createGateway,
  createTestApp,
  post,
} from "./marketplace.controller.testSupport.js";

describe("marketplace controller durable jobs", () => {
  it("does not queue another effect when the same listing is already pending", async () => {
    const app = createTestApp();
    await connectAccount(app);
    const body = {
      batchId: "22222222-2222-4222-8222-222222222222",
      listingIds: ["listing_1"],
      provider: "olx",
    };
    const first = (await (
      await post(app, "/integrations/olx/stock-sync/run", body)
    ).json()) as MarketplaceRunBody;
    const second = (await (
      await post(app, "/integrations/olx/stock-sync/run", body)
    ).json()) as MarketplaceRunBody;

    expect(first.createdJobs).toHaveLength(1);
    expect(second.createdJobs).toHaveLength(0);
    expect(second.plan).toMatchObject({ pending: 1, publish: 0, total: 1 });
  });

  it("refreshes a submitted OLX operation without exposing its token", async () => {
    const app = createTestApp({
      gateway: createGateway({ submissionStatus: "submitted" }),
    });
    await connectAccount(app);
    const run = (await (
      await post(app, "/integrations/olx/stock-sync/run", {
        listingIds: ["listing_1"],
        provider: "olx",
      })
    ).json()) as MarketplaceRunBody;
    const queued = run.createdJobs[0];
    if (!queued) throw new Error("Expected queued marketplace job.");
    const submitted = await post(app, `/sync-jobs/${queued.id}/run`, {});
    expect(await submitted.json()).toMatchObject({ status: "submitted" });

    const reconciled = await post(app, `/sync-jobs/${queued.id}/reconcile`, {});
    const response = (await reconciled.json()) as MarketplaceJobBody;
    expect(response).toMatchObject({
      metadata: { providerResult: { providerListingId: "123456" } },
      status: "succeeded",
    });
    expect(JSON.stringify(response)).not.toContain("operation_1");
  });
});

type MarketplaceRunBody = {
  createdJobs: { id: string; status: string }[];
  plan: { pending: number; publish: number; total: number };
};

type MarketplaceJobBody = {
  metadata: { providerResult?: { providerListingId?: string } };
  status: string;
};
