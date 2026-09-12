import { describe, expect, it } from "vitest";
import type {
  MarketplaceAccount,
  MarketplaceJob,
} from "../../../domains/marketplace/ports/marketplaceRepository.js";
import { buildProviderStates } from "./drizzleMarketplaceOverview.js";

describe("buildProviderStates", () => {
  it("summarizes only the most recent stock-sync batch", () => {
    const account = marketplaceAccount();
    const states = buildProviderStates({
      accounts: [account],
      jobs: [
        marketplaceJob(account.id, "new_batch", "queued"),
        marketplaceJob(account.id, "old_batch", "succeeded"),
      ],
      providers: ["olx"],
    });

    expect(states[0]?.lastSyncSummary).toMatchObject({
      batchId: "new_batch",
      queued: 1,
      succeeded: 0,
      total: 1,
    });
  });
});

function marketplaceAccount(): MarketplaceAccount {
  return {
    config: {},
    createdAt: new Date("2026-08-14T10:00:00.000Z"),
    id: "account_1",
    provider: "olx",
    status: "active",
    storeId: "store_1" as never,
    tenantId: "tenant_1" as never,
    updatedAt: new Date("2026-08-14T10:00:00.000Z"),
  };
}

function marketplaceJob(
  accountId: string,
  batchId: string,
  status: MarketplaceJob["status"],
): MarketplaceJob {
  return {
    accountId,
    completedAt: null,
    createdAt: new Date(),
    errorMessage: null,
    id: `${batchId}_job`,
    jobType: "listing_publish",
    metadata: { batchId, planDecision: "publish", stockSync: true },
    provider: "olx",
    status,
  };
}
