import { describe, expect, it } from "vitest";
import { createMemoryAuditSink } from "../../../shared/auditSink.js";
import {
  connectAccount,
  createGateway,
  createTestApp,
  get,
  post,
} from "./marketplace.controller.testSupport.js";

describe("marketplace controller stock sync", () => {
  it("previews and runs marketplace stock sync jobs", async () => {
    const gateway = createGateway();
    const app = createTestApp({ gateway });
    await connectAccount(app);

    const preview = await post(app, "/integrations/olx/stock-sync/preview", {
      listingIds: ["listing_1"],
      provider: "olx",
    });
    expect(preview.status).toBe(200);
    expect(await preview.json()).toMatchObject({
      plan: { publish: 1, total: 1 },
      provider: "olx",
    });

    const run = await post(app, "/integrations/olx/stock-sync/run", {
      listingIds: ["listing_1"],
      provider: "olx",
    });

    expect(run.status).toBe(200);
    expect(await run.json()).toMatchObject({
      createdJobs: [{ jobType: "listing_publish", status: "succeeded" }],
      plan: { publish: 1 },
      provider: "olx",
    });
    expect(gateway.calls[0]).toMatchObject({
      jobType: "listing_publish",
      metadata: { listingId: "listing_1", stockSync: true },
    });
  });

  it("requires permissions and marketplace entitlement", async () => {
    const missingPermission = createTestApp({
      permissions: ["marketplace.manage"],
    });
    await connectAccount(missingPermission);
    const forbidden = await post(
      missingPermission,
      "/integrations/olx/stock-sync/preview",
      { provider: "olx" },
    );
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toMatchObject({
      code: "AUTHORIZATION_DENIED",
    });

    const missingEntitlement = createTestApp({ entitlements: [] });
    const denied = await post(
      missingEntitlement,
      "/integrations/olx/stock-sync/preview",
      { provider: "olx" },
    );
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({ code: "AUTHORIZATION_DENIED" });
  });

  it("rejects route/body provider mismatches and raw metadata", async () => {
    const app = createTestApp();
    const mismatch = await post(app, "/integrations/olx/stock-sync/run", {
      provider: "mercado_livre",
    });
    expect(mismatch.status).toBe(400);
    expect(await mismatch.json()).toMatchObject({
      code: "MARKETPLACE_REQUEST_VALIDATION_FAILED",
      details: { bodyProvider: "mercado_livre", routeProvider: "olx" },
    });

    const rawMetadata = await post(app, "/integrations/olx/sync-jobs", {
      jobType: "listing_publish",
      metadata: { listingId: "listing_1", rawProviderPayload: {} },
      provider: "olx",
    });
    expect(rawMetadata.status).toBe(400);
    expect(await rawMetadata.json()).toMatchObject({
      code: "MARKETPLACE_REQUEST_VALIDATION_FAILED",
    });
  });

  it("returns stable marketplace errors for known account failures", async () => {
    const app = createTestApp();
    const preview = await post(app, "/integrations/olx/stock-sync/preview", {
      listingIds: ["listing_1"],
      provider: "olx",
    });
    expect(preview.status).toBe(400);
    expect(await preview.json()).toMatchObject({
      code: "MARKETPLACE_ACCOUNT_NOT_CONNECTED",
    });

    const response = await post(app, "/integrations/olx/stock-sync/run", {
      listingIds: ["listing_1"],
      provider: "olx",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "MARKETPLACE_ACCOUNT_NOT_CONNECTED",
    });
  });

  it("projects provider account blockers and blocks stock sync preflight", async () => {
    const gateway = createGateway({
      accountStatus: {
        accountId: "provider_user_1",
        requirements: [
          {
            code: "MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED",
            message: "Marketplace account requirement blocked this operation.",
            severity: "blocked",
            userAction: "Resolve the provider account requirement.",
          },
        ],
        status: "blocked",
      },
    });
    const app = createTestApp({ gateway });
    await connectAccount(app);

    const overview = await get(app, "/overview");
    expect(overview.status).toBe(200);
    const overviewBody = (await overview.json()) as MarketplaceOverviewBody;
    expect(
      overviewBody.providerStates.find(
        (state: { provider: string }) => state.provider === "olx",
      ),
    ).toMatchObject({
      connectionStatus: "blocked",
      requirements: [{ code: "MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED" }],
    });

    const preview = await post(app, "/integrations/olx/stock-sync/preview", {
      listingIds: ["listing_1"],
      provider: "olx",
    });
    expect(preview.status).toBe(403);
    expect(await preview.json()).toMatchObject({
      code: "MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED",
      details: { provider: "olx" },
    });
  });

  it("supports retrying failed sync jobs", async () => {
    const gateway = createGateway({ failOnceFor: "listing_1" });
    const app = createTestApp({ gateway });
    await connectAccount(app);
    const failedRun = await post(app, "/integrations/olx/stock-sync/run", {
      listingIds: ["listing_1"],
      provider: "olx",
    });
    const failedBody = (await failedRun.json()) as MarketplaceRunBody;
    const failedJob = failedBody.createdJobs[0];
    expect(failedJob).toBeDefined();
    if (!failedJob) throw new Error("Expected failed marketplace job.");

    const retry = await post(app, `/sync-jobs/${failedJob.id}/retry`, {
      reason: "operator requested retry",
    });

    expect(retry.status).toBe(200);
    expect(await retry.json()).toMatchObject({
      job: { status: "succeeded" },
      previousJobId: failedJob.id,
    });
  });

  it("reports partial failure and reuses provider listings idempotently", async () => {
    const gateway = createGateway({ failAlwaysFor: "listing_2" });
    const audit = createMemoryAuditSink();
    const app = createTestApp({ audit, gateway });
    await connectAccount(app);

    const partial = await post(app, "/integrations/olx/stock-sync/run", {
      listingIds: ["listing_1", "listing_2"],
      provider: "olx",
    });
    const partialBody = (await partial.json()) as MarketplaceRunBody;
    expect(partial.status).toBe(200);
    expect(
      partialBody.createdJobs.map((job: { status: string }) => job.status),
    ).toEqual(["succeeded", "failed"]);
    expect(audit.events.map((event) => event.action)).toContain(
      "marketplace.stock_sync.partial_failure",
    );

    const secondRun = await post(app, "/integrations/olx/stock-sync/run", {
      listingIds: ["listing_1"],
      provider: "olx",
    });
    expect(await secondRun.json()).toMatchObject({
      createdJobs: [{ jobType: "listing_update", status: "succeeded" }],
      plan: { update: 1 },
    });
  });
});

type MarketplaceOverviewBody = {
  providerStates: {
    connectionStatus: string;
    provider: string;
    requirements: { code: string }[];
  }[];
};

type MarketplaceRunBody = {
  createdJobs: {
    id: string;
    status: string;
  }[];
};
