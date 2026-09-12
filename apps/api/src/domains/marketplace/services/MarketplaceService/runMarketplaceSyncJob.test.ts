import { describe, expect, it } from "vitest";
import { createMemoryAuditSink } from "../../../../shared/auditSink.js";
import {
  createNoopServiceLogger,
  createServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  MarketplaceListingProjection,
  MarketplaceRepository,
} from "../../ports/marketplaceRepository.js";
import type { MarketplacePublishInput } from "../../ports/marketplaceProviderGateway.js";
import { createTestMarketplaceRepository } from "../../testSupportMarketplaceRepository.js";
import { readyListing } from "../../testSupportMarketplaceStockPlan.js";
import { createMarketplaceSyncJob } from "./createMarketplaceSyncJob.js";
import { runMarketplaceSyncJob } from "./runMarketplaceSyncJob.js";
import { upsertMarketplaceAccount } from "./upsertMarketplaceAccount.js";

describe("runMarketplaceSyncJob", () => {
  it.each([
    [
      "hidden listing",
      { isVisibleOnPublicSite: false },
      "Anuncio nao publicado no site publico.",
    ],
    [
      "unpublished listing",
      { status: "unpublished" },
      "Anuncio nao publicado no site publico.",
    ],
    [
      "listing without public photos",
      { mediaUrls: [] },
      "Anuncio sem fotos publicas.",
    ],
  ] as const)("fails before provider IO for %s", async (_, patch, message) => {
    const context = createMarketplaceContext();
    const { calls, ports } = createPorts(readyListing(patch));
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
    const job = await createMarketplaceSyncJob(
      context,
      {
        jobType: "listing_update",
        metadata: { listingId: "listing_1" },
        provider: "olx",
      },
      ports,
    );

    const result = await runMarketplaceSyncJob(
      context,
      { jobId: job.id },
      ports,
    );

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toBe(message);
    expect(calls.runListingSync).toBe(0);
  });

  it("unpublishes with the stored provider id when the listing projection is gone", async () => {
    const context = createMarketplaceContext();
    const { calls, ports } = createPorts(null);
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
    const publishedJob = await createMarketplaceSyncJob(
      context,
      {
        jobType: "listing_publish",
        metadata: { listingId: "listing_1" },
        provider: "olx",
      },
      ports,
    );
    await ports.marketplaceRepository.markJobRunning({
      dispatchLeaseExpiresAt: new Date("2026-01-01T00:01:00.000Z"),
      dispatchLeaseOwner: "publisher",
      jobId: publishedJob.id,
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    });
    await ports.marketplaceRepository.markJobCompleted({
      completedAt: new Date("2026-01-01T00:00:00.000Z"),
      dispatchLeaseOwner: "publisher",
      externalId: "provider_listing_1",
      jobId: publishedJob.id,
      listingId: "listing_1",
      metadata: {},
      provider: "olx",
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    });
    const unpublishJob = await createMarketplaceSyncJob(
      context,
      {
        jobType: "listing_unpublish",
        metadata: { listingId: "listing_1" },
        provider: "olx",
      },
      ports,
    );

    const result = await runMarketplaceSyncJob(
      context,
      { jobId: unpublishJob.id },
      ports,
    );

    expect(result.status).toBe("succeeded");
    expect(calls.runListingSync).toBe(1);
    expect(calls.inputs[0]).toEqual(
      expect.objectContaining({
        externalId: "provider_listing_1",
        jobType: "listing_unpublish",
      }),
    );
    expect(calls.inputs[0]?.listing).toBeUndefined();
  });
});

function createPorts(listing: MarketplaceListingProjection | null) {
  const repository = createTestMarketplaceRepository();
  const calls = {
    inputs: [] as MarketplacePublishInput[],
    runListingSync: 0,
  };
  return {
    calls,
    ports: {
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
            scope: null,
            tokenType: "Bearer",
          }),
          provider: "olx" as const,
          runListingSync: async (input: MarketplacePublishInput) => {
            calls.runListingSync += 1;
            calls.inputs.push(input);
            return {
              externalId: input.externalId ?? "provider_listing_1",
              metadata: {
                providerResult: {
                  externalId: input.externalId ?? "provider_listing_1",
                  providerRequestId: null,
                  providerStatus: "active",
                },
              },
              operationToken: null,
              providerStatus: "active",
            };
          },
        }),
      },
      marketplaceRepository: {
        ...repository,
        findListingProjection: async () => listing,
      } satisfies MarketplaceRepository,
    },
  };
}

function createMarketplaceContext() {
  return Object.assign(
    createServiceContext({
      actor: { id: "user_1", kind: "user" },
      audit: createMemoryAuditSink(),
      logger: createNoopServiceLogger(),
      permissions: [
        "marketplace.listing_update",
        "marketplace.listing_publish",
        "marketplace.listing_unpublish",
        "marketplace.manage",
      ],
      request: { requestId: "req_marketplace" },
      storeId: "store_1",
      tenantId: "tenant_1",
    }),
    { entitlements: ["marketplace"] },
  );
}
