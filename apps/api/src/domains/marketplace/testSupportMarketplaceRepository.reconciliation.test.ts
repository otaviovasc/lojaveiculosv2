import { describe, expect, it } from "vitest";
import type {
  MarketplaceRepository,
  MarketplaceSyncJobType,
} from "./ports/marketplaceRepository.js";
import { createTestMarketplaceRepository } from "./testSupportMarketplaceRepository.js";

const scope = { storeId: "store-1" as never, tenantId: "tenant-1" as never };
const now = new Date("2026-08-14T12:00:00.000Z");

describe("marketplace reconciliation repository", () => {
  it("keeps operation tokens private and claims a submitted job once", async () => {
    const repository = await setupRepository();
    const job = await submitJob(
      repository,
      "listing_publish",
      now,
      "secret-token",
    );

    expect(job.metadata).not.toHaveProperty("operationToken");
    const [first, second] = await Promise.all([
      claim(repository, job.id, "worker-a", now),
      claim(repository, job.id, "worker-b", now),
    ]);
    const winner = [...first, ...second];
    expect(winner).toHaveLength(1);
    expect(winner[0]).toMatchObject({
      attemptCount: 1,
      operationToken: "secret-token",
    });
    expect(winner[0]?.job).not.toHaveProperty("operationToken");
    expect(
      await repository.findSyncJob({ jobId: job.id, ...scope }),
    ).not.toHaveProperty("operationToken");
  });

  it("filters future work, reclaims expired leases, and rejects stale owners", async () => {
    const repository = await setupRepository();
    const future = new Date(now.getTime() + 60_000);
    const job = await submitJob(repository, "listing_publish", future, "token");

    expect(
      await repository.listProcessableJobScopes({ limit: 10, now }),
    ).toEqual([]);
    expect(await claim(repository, job.id, "early", now)).toEqual([]);

    const forced = await repository.claimSubmittedJobs({
      ...scope,
      force: true,
      jobId: job.id,
      leaseExpiresAt: new Date(now.getTime() + 1_000),
      leaseOwner: "stale-worker",
      limit: 1,
      now,
    });
    expect(forced).toHaveLength(1);
    expect(
      await repository.rescheduleSubmittedJob({
        ...scope,
        checkedAt: now,
        jobId: job.id,
        leaseOwner: "wrong-worker",
        metadata: {},
        nextAttemptAt: future,
      }),
    ).toBeNull();

    const reclaimed = await claim(
      repository,
      job.id,
      "replacement-worker",
      new Date(future.getTime() + 1),
    );
    expect(reclaimed).toHaveLength(1);
    expect(reclaimed[0]?.attemptCount).toBe(2);
    expect(
      await repository.failSubmittedJob({
        ...scope,
        completedAt: now,
        errorMessage: "provider refused",
        jobId: job.id,
        leaseOwner: "stale-worker",
        metadata: {},
      }),
    ).toBeNull();
  });

  it("upserts accepted publications and removes accepted unpublishes", async () => {
    const repository = await setupRepository();
    const publish = await submitJob(
      repository,
      "listing_publish",
      now,
      "publish-token",
    );
    await claim(repository, publish.id, "publisher", now);
    await repository.completeSubmittedJob({
      ...scope,
      completedAt: now,
      externalId: "olx-list-1",
      jobId: publish.id,
      leaseOwner: "publisher",
      listingId: "listing-1",
      metadata: { listingUrl: "https://olx.test/list-1" },
      provider: "olx",
    });
    expect(
      await repository.findProviderListing({
        ...scope,
        accountId: publish.accountId,
        listingId: "listing-1",
      }),
    ).toMatchObject({ externalId: "olx-list-1" });

    const unpublish = await submitJob(
      repository,
      "listing_unpublish",
      now,
      "delete-token",
    );
    await claim(repository, unpublish.id, "unpublisher", now);
    await repository.completeSubmittedJob({
      ...scope,
      completedAt: now,
      externalId: "olx-list-1",
      jobId: unpublish.id,
      leaseOwner: "unpublisher",
      listingId: "listing-1",
      metadata: {},
      provider: "olx",
    });
    expect(
      await repository.findProviderListing({
        ...scope,
        accountId: publish.accountId,
        listingId: "listing-1",
      }),
    ).toBeNull();
  });

  it("finds the exact archived job account without crossing scope", async () => {
    const repository = await setupRepository("provider-account-old");
    const old = await repository.findAccount({ provider: "olx", ...scope });
    const oldAccountJob = await repository.createSyncJob({
      ...scope,
      jobType: "listing_update",
      metadata: { listingId: "listing-archived-account" },
      provider: "olx",
    });
    await repository.upsertAccount({
      ...scope,
      config: { connection: { providerAccountId: "provider-account-new" } },
      provider: "olx",
      providerAccountId: "provider-account-new",
      status: "active",
    });
    expect(
      await repository.findAccountById({
        ...scope,
        accountId: old?.id ?? "missing",
      }),
    ).toMatchObject({ id: old?.id });
    expect(
      await repository.findAccountById({
        accountId: old?.id ?? "missing",
        storeId: "other-store" as never,
        tenantId: scope.tenantId,
      }),
    ).toBeNull();
    expect(
      await repository.listActiveSyncJobs({
        ...scope,
        listingIds: ["listing-archived-account"],
        provider: "olx",
      }),
    ).toEqual([oldAccountJob]);
    expect(
      await repository.listActiveSyncJobs({
        ...scope,
        listingIds: ["different-listing"],
        provider: "olx",
      }),
    ).toEqual([]);
  });
});

async function setupRepository(providerAccountId = "provider-account-1") {
  const repository = createTestMarketplaceRepository();
  await repository.upsertAccount({
    ...scope,
    config: { connection: { providerAccountId } },
    provider: "olx",
    providerAccountId,
    status: "active",
  });
  return repository;
}

async function submitJob(
  repository: MarketplaceRepository,
  jobType: MarketplaceSyncJobType,
  nextAttemptAt: Date,
  operationToken: string,
) {
  const dispatchLeaseOwner = `dispatch-${operationToken}`;
  const queued = await repository.createSyncJob({
    ...scope,
    jobType,
    metadata: { operationToken, requestedBy: "test" },
    provider: "olx",
  });
  await repository.markJobRunning({
    ...scope,
    dispatchLeaseExpiresAt: new Date(now.getTime() + 30_000),
    dispatchLeaseOwner,
    jobId: queued.id,
  });
  const submitted = await repository.markJobSubmitted({
    ...scope,
    dispatchLeaseOwner,
    jobId: queued.id,
    listingId: "listing-1",
    metadata: queued.metadata,
    nextAttemptAt,
    operationExpiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1_000),
    operationToken,
    provider: "olx",
  });
  if (!submitted) throw new Error("Expected submitted marketplace job.");
  return submitted;
}

function claim(
  repository: MarketplaceRepository,
  jobId: string,
  leaseOwner: string,
  claimedAt: Date,
) {
  return repository.claimSubmittedJobs({
    ...scope,
    jobId,
    leaseExpiresAt: new Date(claimedAt.getTime() + 30_000),
    leaseOwner,
    limit: 1,
    now: claimedAt,
  });
}
