import { describe, expect, it, vi } from "vitest";
import { createMemoryAuditSink } from "../../../../shared/auditSink.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createTestMarketplaceRepository } from "../../testSupportMarketplaceRepository.js";
import { processMarketplaceJobs } from "./reconcileMarketplaceSyncJobs.js";

describe("processMarketplaceJobs entitlement boundary", () => {
  it("does not dispatch queued provider effects after marketplace access ends", async () => {
    const repository = createTestMarketplaceRepository();
    await repository.upsertAccount({
      config: {
        connection: { scope: "autoupload" },
        credentials: { accessToken: "access-token" },
      },
      provider: "olx",
      status: "active",
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    });
    const job = await repository.createSyncJob({
      jobType: "listing_publish",
      metadata: { listingId: "listing_1" },
      provider: "olx",
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    });
    const getGateway = vi.fn();
    const context = Object.assign(
      createServiceContext({
        actor: { id: "marketplace_worker", kind: "system" },
        audit: createMemoryAuditSink(),
        permissions: [
          "marketplace.inventory_sync",
          "marketplace.listing_publish",
        ],
        request: { requestId: "marketplace_worker_1" },
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
      { entitlements: ["marketplace" as const] },
    );

    const result = await processMarketplaceJobs(
      context,
      { now: new Date("2026-08-14T12:00:00.000Z") },
      {
        gatewayRegistry: { getGateway },
        isMarketplaceEntitled: async () => false,
        marketplaceRepository: repository,
      },
    );

    expect(result.processed).toBe(0);
    expect(getGateway).not.toHaveBeenCalled();
    expect(
      await repository.findSyncJob({
        jobId: job.id,
        storeId: "store_1" as never,
        tenantId: "tenant_1" as never,
      }),
    ).toMatchObject({ status: "queued" });
  });
});
