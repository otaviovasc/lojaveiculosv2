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
import { createMarketplaceSyncJob } from "./createMarketplaceSyncJob.js";
import { runMarketplaceSyncJob } from "./runMarketplaceSyncJob.js";
import { upsertMarketplaceAccount } from "./upsertMarketplaceAccount.js";

describe("runMarketplaceSyncJob", () => {
  it.each([
    [
      "hidden listing",
      { isVisibleOnPublicSite: false },
      "Listing must be published and public-visible before marketplace sync.",
    ],
    [
      "unpublished listing",
      { status: "unpublished" },
      "Listing must be published and public-visible before marketplace sync.",
    ],
    [
      "listing without public photos",
      { mediaUrls: [] },
      "Listing must have at least one public photo before marketplace sync.",
    ],
  ] as const)("fails before provider IO for %s", async (_, patch, message) => {
    const context = createMarketplaceContext();
    const { calls, ports } = createPorts(projection(patch));
    await upsertMarketplaceAccount(
      context,
      {
        config: { credentials: { accessToken: "token_1" } },
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
        config: { credentials: { accessToken: "token_1" } },
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
    await ports.marketplaceRepository.markJobCompleted({
      completedAt: new Date("2026-01-01T00:00:00.000Z"),
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
              metadata: { accepted: true },
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

function projection(
  patch: Partial<MarketplaceListingProjection> = {},
): MarketplaceListingProjection {
  return {
    description: "Anuncio de teste para integracao.",
    isVisibleOnPublicSite: true,
    listingId: "listing_1",
    mediaUrls: ["https://cdn.local/vehicle-front.jpg"],
    modelYear: 2024,
    priceCents: 10000000,
    status: "published",
    title: "Veiculo de teste",
    vehicleType: "cars",
    ...patch,
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
