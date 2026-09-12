import { describe, expect, it } from "vitest";
import { createMemoryAuditSink } from "../../../../shared/auditSink.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { MarketplaceListingReconciliationResult } from "../../ports/marketplaceProviderGateway.js";
import { createTestMarketplaceRepository } from "../../testSupportMarketplaceRepository.js";
import { processMarketplaceJobs } from "./reconcileMarketplaceSyncJobs.js";

const now = new Date("2026-08-14T12:00:00.000Z");
const scope = { storeId: "store_1" as never, tenantId: "tenant_1" as never };

describe("processMarketplaceJobs reconciliation", () => {
  it("keeps a pending OLX import submitted without exposing its token", async () => {
    const setup = await submittedJob(outcome("pending"));

    const result = await processMarketplaceJobs(
      setup.context,
      { limit: 1, now },
      setup.ports,
    );

    expect(result).toMatchObject({ processed: 1, submitted: 1 });
    const job = await setup.repository.findSyncJob({
      jobId: setup.jobId,
      ...scope,
    });
    expect(job).toMatchObject({
      metadata: { providerResult: { providerStatus: "pending" } },
      status: "submitted",
    });
    expect(JSON.stringify(job)).not.toContain("private-operation-token");
  });

  it("persists accepted OLX list identity and completes publication", async () => {
    const setup = await submittedJob(
      outcome("accepted", {
        listId: "123456",
        listingUrl: "https://www.olx.com.br/item/123456",
      }),
    );

    const result = await processMarketplaceJobs(
      setup.context,
      { limit: 1, now },
      setup.ports,
    );

    expect(result).toMatchObject({ processed: 1, succeeded: 1 });
    const job = await setup.repository.findSyncJob({
      jobId: setup.jobId,
      ...scope,
    });
    expect(job).toMatchObject({
      metadata: { providerResult: { providerListingId: "123456" } },
      status: "succeeded",
    });
    expect(
      await setup.repository.findProviderListing({
        accountId: setup.accountId,
        listingId: "listing_1",
        ...scope,
      }),
    ).toMatchObject({
      metadata: { providerResult: { providerListingId: "123456" } },
    });
  });

  it("records an OLX refusal as terminal and does not resubmit", async () => {
    const setup = await submittedJob(
      outcome("refused", { message: "invalid vehicle version" }),
    );

    const result = await processMarketplaceJobs(
      setup.context,
      { limit: 1, now },
      setup.ports,
    );

    expect(result).toMatchObject({ failed: 1, processed: 1 });
    expect(
      await setup.repository.findSyncJob({ jobId: setup.jobId, ...scope }),
    ).toMatchObject({
      errorMessage: "invalid vehicle version",
      status: "failed",
    });
    expect(setup.calls.reconcile).toBe(1);
    expect(setup.calls.publish).toBe(0);
  });

  it("stops automatic polling after an expired operation remains unknown", async () => {
    const setup = await submittedJob(outcome("unknown"), {
      operationExpiresAt: new Date(now.getTime() - 1),
    });

    await processMarketplaceJobs(setup.context, { limit: 1, now }, setup.ports);
    const again = await processMarketplaceJobs(
      setup.context,
      { limit: 1, now: new Date(now.getTime() + 86_400_000) },
      setup.ports,
    );

    expect(again.processed).toBe(0);
    expect(setup.calls.reconcile).toBe(1);
    const job = await setup.repository.findSyncJob({
      jobId: setup.jobId,
      ...scope,
    });
    expect(job?.status).toBe("submitted");
    expect(job?.metadata.reconciliationRequired).toBe(true);
    expect(job?.metadata.reconciliationMessage).toEqual(
      expect.stringContaining("não confirmou a operação dentro do prazo"),
    );
  });
});

async function submittedJob(
  reconciliation: MarketplaceListingReconciliationResult,
  options: { operationExpiresAt?: Date } = {},
) {
  const repository = createTestMarketplaceRepository();
  const account = await repository.upsertAccount({
    ...scope,
    config: {
      connection: { scope: "autoupload" },
      credentials: { accessToken: "access-token" },
    },
    provider: "olx",
    providerAccountId: "olx-account-1",
    status: "active",
  });
  const job = await repository.createSyncJob({
    ...scope,
    jobType: "listing_publish",
    metadata: { listingId: "listing_1" },
    provider: "olx",
  });
  await repository.markJobRunning({
    dispatchLeaseExpiresAt: new Date(now.getTime() + 60_000),
    dispatchLeaseOwner: "dispatch-owner",
    jobId: job.id,
    ...scope,
  });
  await repository.markJobSubmitted({
    ...scope,
    dispatchLeaseOwner: "dispatch-owner",
    jobId: job.id,
    listingId: "listing_1",
    metadata: { listingId: "listing_1" },
    nextAttemptAt: now,
    operationExpiresAt:
      options.operationExpiresAt ?? new Date(now.getTime() + 86_400_000),
    operationToken: "private-operation-token",
    provider: "olx",
  });
  const calls = { publish: 0, reconcile: 0 };
  const context = createServiceContext({
    actor: { id: "marketplace_worker", kind: "system" },
    audit: createMemoryAuditSink(),
    permissions: ["marketplace.inventory_sync"],
    request: { requestId: "reconcile_request_1" },
    ...scope,
  });
  return {
    accountId: account.id,
    calls,
    context,
    jobId: job.id,
    ports: {
      gatewayRegistry: {
        getGateway: () => ({
          checkAccount: async () => ({
            accountId: account.id,
            requirements: [],
            status: "connected" as const,
          }),
          createAuthorizationUrl: async () => "https://provider.test/oauth",
          exchangeAuthorizationCode: async () => ({
            accessToken: "token",
            expiresAt: null,
            providerAccountId: account.id,
            refreshToken: null,
            scope: "autoupload",
            tokenType: "Bearer",
          }),
          provider: "olx" as const,
          reconcileListingSync: async () => {
            calls.reconcile += 1;
            return reconciliation;
          },
          runListingSync: async () => {
            calls.publish += 1;
            return {
              externalId: null,
              metadata: {},
              operationToken: null,
              providerStatus: "unknown",
            };
          },
        }),
      },
      marketplaceRepository: repository,
    },
    repository,
  };
}

function outcome(
  state: MarketplaceListingReconciliationResult["state"],
  patch: Partial<MarketplaceListingReconciliationResult> = {},
): MarketplaceListingReconciliationResult {
  return {
    externalId: "lv_7c1c97df17c06692",
    listId: null,
    listingUrl: null,
    message: null,
    providerStatus: state,
    state,
    ...patch,
  };
}
