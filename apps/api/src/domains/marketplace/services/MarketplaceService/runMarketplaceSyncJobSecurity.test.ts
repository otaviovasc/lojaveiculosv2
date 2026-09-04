import { describe, expect, it } from "vitest";
import { createMemoryAuditSink } from "../../../../shared/auditSink.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { MarketplacePublishInput } from "../../ports/marketplaceProviderGateway.js";
import { createTestMarketplaceRepository } from "../../testSupportMarketplaceRepository.js";
import { createMarketplaceSyncJob } from "./createMarketplaceSyncJob.js";
import { runMarketplaceSyncJob } from "./runMarketplaceSyncJob.js";
import { upsertMarketplaceAccount } from "./upsertMarketplaceAccount.js";

describe("runMarketplaceSyncJob security", () => {
  it("ignores an injected external id and uses the scoped provider listing", async () => {
    const setup = await createUnpublishSetup({
      externalId: "attacker-controlled-ad",
    });

    const result = await runMarketplaceSyncJob(
      setup.context,
      { jobId: setup.job.id },
      setup.ports,
    );

    expect(result.status).toBe("succeeded");
    expect(setup.calls.inputs[0]?.externalId).toBe("owned-provider-ad");
  });

  it("allows only one concurrent runner to call OLX", async () => {
    const setup = await createUnpublishSetup();

    const results = await Promise.allSettled([
      runMarketplaceSyncJob(
        setup.context,
        { jobId: setup.job.id },
        setup.ports,
      ),
      runMarketplaceSyncJob(
        setup.context,
        { jobId: setup.job.id },
        setup.ports,
      ),
    ]);

    expect(setup.calls.inputs).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
  });

  it("keeps an OLX submission pending instead of claiming it was published", async () => {
    const setup = await createUnpublishSetup({}, "submitted");

    const result = await runMarketplaceSyncJob(
      setup.context,
      { jobId: setup.job.id },
      setup.ports,
    );

    expect(result.status).toBe("submitted");
    await expect(
      runMarketplaceSyncJob(
        setup.context,
        { jobId: setup.job.id },
        setup.ports,
      ),
    ).rejects.toMatchObject({ code: "MARKETPLACE_SYNC_JOB_STALE" });
    expect(setup.calls.inputs).toHaveLength(1);
  });

  it("does not make an indeterminate provider timeout blindly retryable", async () => {
    const setup = await createUnpublishSetup({}, "active", true);

    const result = await runMarketplaceSyncJob(
      setup.context,
      { jobId: setup.job.id },
      setup.ports,
    );

    expect(result.status).toBe("submitted");
    expect(result.metadata).toMatchObject({
      providerResult: { providerStatus: "indeterminate" },
      reconciliationRequired: true,
    });
  });
});

async function createUnpublishSetup(
  metadata: Record<string, unknown> = {},
  providerStatus = "active",
  throwIndeterminate = false,
) {
  const repository = createTestMarketplaceRepository();
  const calls = { inputs: [] as MarketplacePublishInput[] };
  const ports = {
    gatewayRegistry: {
      getGateway: () => ({
        checkAccount: async () => ({
          accountId: "provider_user_1",
          requirements: [],
          status: "connected" as const,
        }),
        createAuthorizationUrl: async () => "https://provider.test/oauth",
        exchangeAuthorizationCode: async () => ({
          accessToken: "token_1",
          expiresAt: null,
          providerAccountId: "provider_user_1",
          refreshToken: null,
          scope: "autoupload",
          tokenType: "Bearer",
        }),
        provider: "olx" as const,
        runListingSync: async (input: MarketplacePublishInput) => {
          calls.inputs.push(input);
          if (throwIndeterminate) throw new TypeError("fetch failed");
          return {
            externalId: input.externalId ?? null,
            metadata: {},
            operationToken:
              providerStatus === "submitted" ? "operation_1" : null,
            providerStatus,
          };
        },
      }),
    },
    marketplaceRepository: repository,
  };
  const context = marketplaceContext();
  await upsertMarketplaceAccount(
    context,
    {
      config: {
        connection: { scope: "autoupload" },
        credentials: { accessToken: "token_1" },
      },
      provider: "olx",
      status: "active",
    },
    ports,
  );
  const published = await createMarketplaceSyncJob(
    context,
    {
      jobType: "listing_publish",
      metadata: { listingId: "listing_1" },
      provider: "olx",
    },
    ports,
  );
  await repository.markJobRunning({
    dispatchLeaseExpiresAt: new Date(Date.now() + 60_000),
    dispatchLeaseOwner: "publisher",
    jobId: published.id,
    storeId: "store_1" as never,
    tenantId: "tenant_1" as never,
  });
  await repository.markJobCompleted({
    completedAt: new Date(),
    dispatchLeaseOwner: "publisher",
    externalId: "owned-provider-ad",
    jobId: published.id,
    listingId: "listing_1",
    provider: "olx",
    storeId: "store_1" as never,
    tenantId: "tenant_1" as never,
  });
  const job = await createMarketplaceSyncJob(
    context,
    {
      jobType: "listing_unpublish",
      metadata: { ...metadata, listingId: "listing_1" },
      provider: "olx",
    },
    ports,
  );
  return { calls, context, job, ports };
}

function marketplaceContext() {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    audit: createMemoryAuditSink(),
    entitlements: ["marketplace"],
    permissions: [
      "marketplace.listing_publish",
      "marketplace.listing_unpublish",
      "marketplace.manage",
    ],
    request: { requestId: "request_1" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}
