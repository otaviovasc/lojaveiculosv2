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
import {
  createResolvedMarketplaceCatalogMapping,
  createTestMarketplaceRepository,
} from "../../testSupportMarketplaceRepository.js";
import { toTestMarketplaceListing } from "../../testSupportMarketplaceRecords.js";
import { createMarketplaceSyncJob } from "./createMarketplaceSyncJob.js";
import { runMarketplaceSyncJob } from "./runMarketplaceSyncJob.js";
import { upsertMarketplaceAccount } from "./upsertMarketplaceAccount.js";

describe("runMarketplaceSyncJob catalog mappings", () => {
  it("passes resolved provider catalog mappings to the provider gateway", async () => {
    const calls: MarketplacePublishInput[] = [];
    const repository = createTestMarketplaceRepository();
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
            scope: null,
            tokenType: "Bearer",
          }),
          provider: "olx" as const,
          runListingSync: async (input: MarketplacePublishInput) => {
            calls.push(input);
            return {
              externalId: "provider_listing_1",
              metadata: {},
              operationToken: null,
              providerStatus: "active",
            };
          },
        }),
      },
      marketplaceRepository: {
        ...repository,
        findCatalogMapping: async () =>
          createResolvedMarketplaceCatalogMapping("olx"),
        findListingProjection: async () => listingProjection(),
      } satisfies MarketplaceRepository,
    };
    const context = createMarketplaceContext();
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
        jobType: "listing_publish",
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

    expect(result.status).toBe("succeeded");
    expect(calls[0]?.metadata).toMatchObject({
      providerMapping: {
        providerBrandCode: "provider_brand_21",
        providerModelCode: "provider_model_4828",
        providerTrimCode: "provider_trim_001267_0",
        providerYearCode: "provider_year_2024_1",
      },
    });
  });

  it("uses an OLX mapping carried by a reviewed stock plan", async () => {
    const calls: MarketplacePublishInput[] = [];
    const repository = createTestMarketplaceRepository();
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
            calls.push(input);
            return {
              externalId: "provider_listing_1",
              metadata: {},
              operationToken: "operation_1",
              providerStatus: "submitted",
            };
          },
        }),
      },
      marketplaceRepository: {
        ...repository,
        findCatalogMapping: async () => null,
        findListingProjection: async () => listingProjection(),
      } satisfies MarketplaceRepository,
    };
    const context = createMarketplaceContext();
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
        jobType: "listing_publish",
        metadata: {
          listingId: "listing_1",
          providerMapping: {
            providerBrandCode: "17",
            providerModelCode: "5",
            providerTrimCode: "3",
            providerYearCode: null,
          },
        },
        provider: "olx",
      },
      ports,
    );

    const result = await runMarketplaceSyncJob(
      context,
      { jobId: job.id },
      ports,
    );

    expect(result.status).toBe("submitted");
    expect(calls[0]?.metadata.providerMapping).toEqual({
      providerBrandCode: "17",
      providerModelCode: "5",
      providerTrimCode: "3",
      providerYearCode: null,
    });
  });
});

function listingProjection(): MarketplaceListingProjection {
  return toTestMarketplaceListing("listing_1");
}

function createMarketplaceContext() {
  return Object.assign(
    createServiceContext({
      actor: { id: "user_1", kind: "user" },
      audit: createMemoryAuditSink(),
      logger: createNoopServiceLogger(),
      permissions: ["marketplace.listing_publish", "marketplace.manage"],
      request: { requestId: "req_marketplace" },
      storeId: "store_1",
      tenantId: "tenant_1",
    }),
    { entitlements: ["marketplace"] },
  );
}
