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
    const runBody = (await run.json()) as MarketplaceRunBody;
    expect(runBody).toMatchObject({
      createdJobs: [{ jobType: "listing_publish", status: "queued" }],
      plan: { publish: 1 },
      provider: "olx",
    });
    expect(gateway.calls).toHaveLength(0);
    const queuedJob = runBody.createdJobs[0];
    if (!queuedJob) throw new Error("Expected queued marketplace job.");
    const processed = await post(app, `/sync-jobs/${queuedJob.id}/run`, {});
    expect(processed.status).toBe(200);
    expect(await processed.json()).toMatchObject({ status: "succeeded" });
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
    const gateway = createGateway({ rejectOnceFor: "listing_1" });
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
    const processed = await post(app, `/sync-jobs/${failedJob.id}/run`, {});
    expect(await processed.json()).toMatchObject({ status: "failed" });

    const retry = await post(app, `/sync-jobs/${failedJob.id}/retry`, {
      reason: "operator requested retry",
    });

    expect(retry.status).toBe(200);
    const retryBody = (await retry.json()) as {
      job: { id: string; status: string };
      previousJobId: string;
    };
    expect(retryBody).toMatchObject({
      job: { status: "queued" },
      previousJobId: failedJob.id,
    });
    const retried = await post(app, `/sync-jobs/${retryBody.job.id}/run`, {});
    expect(await retried.json()).toMatchObject({ status: "succeeded" });
  });

  it("processes queued jobs independently and reuses provider listings", async () => {
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
    expect(partialBody.createdJobs.map((job) => job.status)).toEqual([
      "queued",
      "queued",
    ]);
    const processed = await Promise.all(
      partialBody.createdJobs.map((job) =>
        Promise.resolve(post(app, `/sync-jobs/${job.id}/run`, {})).then(
          (response) => response.json(),
        ),
      ),
    );
    expect(processed).toMatchObject([
      { status: "succeeded" },
      { status: "submitted" },
    ]);
    expect(audit.events.map((event) => event.action)).not.toContain(
      "marketplace.stock_sync.partial_failure",
    );

    const secondRun = await post(app, "/integrations/olx/stock-sync/run", {
      listingIds: ["listing_1"],
      provider: "olx",
    });
    expect(await secondRun.json()).toMatchObject({
      createdJobs: [{ jobType: "listing_update", status: "queued" }],
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
