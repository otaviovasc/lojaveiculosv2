import { describe, expect, it } from "vitest";
import { createMemoryAuditSink } from "../../../../shared/auditSink.js";
import {
  createNoopServiceLogger,
  createServiceContext,
} from "../../../../shared/serviceContext.js";
import { createTestMarketplaceRepository } from "../../testSupportMarketplaceRepository.js";
import { createMarketplaceSyncJob } from "./createMarketplaceSyncJob.js";
import { listMarketplaceOverview } from "./listMarketplaceOverview.js";
import { runMarketplaceSyncJob } from "./runMarketplaceSyncJob.js";
import { upsertMarketplaceAccount } from "./upsertMarketplaceAccount.js";

describe("MarketplaceService", () => {
  it("manages accounts and queues scoped sync jobs", async () => {
    const audit = createMemoryAuditSink();
    const repository = createTestMarketplaceRepository();
    const context = createMarketplaceContext(audit);

    await upsertMarketplaceAccount(
      context,
      { provider: "olx", status: "active" },
      { marketplaceRepository: repository },
    );
    const job = await createMarketplaceSyncJob(
      context,
      {
        jobType: "inventory_sync",
        metadata: { listingId: "listing_1" },
        provider: "olx",
      },
      { marketplaceRepository: repository },
    );
    const overview = await listMarketplaceOverview(context, {
      marketplaceRepository: repository,
    });

    expect(job.status).toBe("queued");
    expect(overview.accounts[0]?.provider).toBe("olx");
    expect(overview.jobs[0]?.jobType).toBe("inventory_sync");
    expect(audit.events.map((event) => event.action)).toEqual([
      "marketplace.account.upsert",
      "marketplace.sync_job.create",
      "marketplace.overview.read",
    ]);
  });

  it("runs a queued provider sync job", async () => {
    const audit = createMemoryAuditSink();
    const repository = createTestMarketplaceRepository();
    const context = createMarketplaceContext(audit);
    const ports = {
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
          runListingSync: async () => ({
            externalId: "provider_listing_1",
            metadata: { accepted: true },
            providerStatus: "active",
          }),
        }),
      },
      marketplaceRepository: repository,
    };

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

    expect(result.status).toBe("succeeded");
    expect(result.metadata.providerResult).toEqual({ accepted: true });
  });

  it("requires marketplace entitlement before reading", async () => {
    const context = createMarketplaceContext(createMemoryAuditSink(), {
      entitlements: [],
    });

    await expect(
      listMarketplaceOverview(context, {
        marketplaceRepository: createTestMarketplaceRepository(),
      }),
    ).rejects.toThrow("Missing entitlement: marketplace");
  });
});

function createMarketplaceContext(
  audit: ReturnType<typeof createMemoryAuditSink>,
  overrides: { entitlements?: string[] } = {},
) {
  return Object.assign(
    createServiceContext({
      actor: { id: "user_1", kind: "user" },
      audit,
      logger: createNoopServiceLogger(),
      permissions: [
        "marketplace.inventory_sync",
        "marketplace.listing_update",
        "marketplace.manage",
        "marketplace.read",
      ],
      request: { requestId: "req_marketplace" },
      storeId: "store_1",
      tenantId: "tenant_1",
    }),
    {
      entitlements: overrides.entitlements ?? ["marketplace"],
    },
  );
}
