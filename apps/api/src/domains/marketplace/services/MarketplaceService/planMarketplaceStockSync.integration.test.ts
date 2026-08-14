import { describe, expect, it } from "vitest";
import type { MarketplaceRepository } from "../../ports/marketplaceRepository.js";
import { createTestMarketplaceRepository } from "../../testSupportMarketplaceRepository.js";
import {
  marketplaceContext,
  readyListing,
  tokenSet,
} from "../../testSupportMarketplaceStockPlan.js";
import { planMarketplaceStockSync } from "./planMarketplaceStockSync.js";

describe("planMarketplaceStockSync integration", () => {
  it("resolves a fresh OLX catalog mapping before blocking a ready listing", async () => {
    const repository = createTestMarketplaceRepository();
    await seedOlxAccount(repository);
    const volvo = readyListing({
      catalog: {
        brandCode: "59",
        brandName: "Volvo",
        fipeCode: "029039-4",
        fuel: "Gasolina",
        modelCode: "2344",
        modelName: "V40 T-4 2.0 Aut./Mec.",
        modelYear: 2013,
        referenceMonth: "agosto de 2026",
        source: "fipe",
        vehicleType: "cars",
        yearCode: "2013-1",
        yearName: "2013 Gasolina",
      },
      modelYear: 2013,
      title: "Volvo V40 T-4 2.0 Aut./Mec. 2013",
    });
    const plan = await planMarketplaceStockSync(
      marketplaceContext(),
      { provider: "olx" },
      {
        gatewayRegistry: {
          getGateway: () => ({
            checkAccount: async () => ({
              accountId: "seller_1",
              requirements: [],
              status: "connected" as const,
            }),
            createAuthorizationUrl: async () => "https://provider.test/oauth",
            exchangeAuthorizationCode: async () => tokenSet(),
            provider: "olx" as const,
            resolveCatalogMapping: async () => ({
              providerBrandCode: "59",
              providerModelCode: "11",
              providerTrimCode: "27",
              providerYearCode: null,
              status: "resolved" as const,
              unresolvedReason: null,
            }),
            runListingSync: async () => ({
              externalId: "olx_1",
              metadata: {},
              operationToken: "operation_1",
              providerStatus: "submitted",
            }),
          }),
        },
        marketplaceRepository: {
          ...repository,
          findCatalogMapping: async () => null,
          listListingProjections: async () => [volvo],
        },
      },
    );

    expect(plan).toMatchObject({ blocked: 0, publish: 1, total: 1 });
    expect(plan.items[0]?.providerMapping).toEqual({
      providerBrandCode: "59",
      providerModelCode: "11",
      providerTrimCode: "27",
      providerYearCode: null,
    });
  });

  it("unpublishes provider state whose local listing was deleted", async () => {
    const repository = createTestMarketplaceRepository();
    await seedOlxAccount(repository);
    const published = await repository.createSyncJob({
      jobType: "listing_publish",
      metadata: { listingId: "deleted_listing" },
      provider: "olx",
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    });
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
      externalId: "olx_deleted_listing",
      jobId: published.id,
      listingId: "deleted_listing",
      provider: "olx",
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    });
    const plan = await planMarketplaceStockSync(
      marketplaceContext(),
      { provider: "olx" },
      {
        gatewayRegistry: {
          getGateway: () =>
            ({
              checkAccount: async () => ({
                accountId: "seller_1",
                requirements: [],
                status: "connected",
              }),
            }) as never,
        },
        marketplaceRepository: {
          ...repository,
          listListingProjections: async () => [],
        },
      },
    );

    expect(plan).toMatchObject({ total: 1, unpublish: 1 });
    expect(plan.items[0]).toMatchObject({
      decision: "unpublish",
      externalId: "olx_deleted_listing",
      listing: { listingId: "deleted_listing" },
    });
  });

  it("reports an in-flight listing without queueing a duplicate operation", async () => {
    const repository = createTestMarketplaceRepository();
    await seedOlxAccount(repository);
    await repository.createSyncJob({
      jobType: "listing_publish",
      metadata: {
        batchId: "11111111-1111-4111-8111-111111111111",
        listingId: "listing_1",
      },
      provider: "olx",
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    });

    const plan = await planMarketplaceStockSync(
      marketplaceContext(),
      { listingIds: ["listing_1"], provider: "olx" },
      {
        gatewayRegistry: {
          getGateway: () =>
            ({
              checkAccount: async () => ({
                accountId: "seller_1",
                requirements: [],
                status: "connected",
              }),
            }) as never,
        },
        marketplaceRepository: repository,
      },
    );

    expect(plan).toMatchObject({
      blocked: 0,
      pending: 1,
      publish: 0,
      total: 1,
    });
    expect(plan.items[0]).toMatchObject({
      decision: "pending",
      jobType: null,
      listing: { listingId: "listing_1" },
    });
  });
});

function seedOlxAccount(repository: MarketplaceRepository) {
  return repository.upsertAccount({
    config: {
      connection: { scope: "autoupload" },
      credentials: { accessToken: "token_1" },
    },
    provider: "olx",
    status: "active",
    storeId: "store_1" as never,
    tenantId: "tenant_1" as never,
  });
}
