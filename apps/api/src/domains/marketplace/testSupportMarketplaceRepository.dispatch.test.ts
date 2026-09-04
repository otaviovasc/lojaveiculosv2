import { describe, expect, it } from "vitest";
import { createTestMarketplaceRepository } from "./testSupportMarketplaceRepository.js";

const scope = { storeId: "store-1" as never, tenantId: "tenant-1" as never };
const now = new Date("2026-08-14T12:00:00.000Z");

describe("marketplace dispatch repository", () => {
  it("deduplicates concurrent commands with the same operation key", async () => {
    const repository = await setupRepository();
    const input = {
      ...scope,
      jobType: "listing_publish" as const,
      metadata: {
        commandId: "11111111-1111-4111-8111-111111111111",
        listingId: "listing-command",
      },
      provider: "olx" as const,
    };

    const jobs = await Promise.all([
      repository.createSyncJob(input),
      repository.createSyncJob(input),
    ]);

    expect(jobs[0]?.id).toBe(jobs[1]?.id);
  });

  it("CAS-guards running transitions and recovers expired dispatches without resend", async () => {
    const repository = await setupRepository();
    const queued = await repository.createSyncJob({
      ...scope,
      jobType: "listing_publish",
      metadata: { listingId: "listing-1" },
      provider: "olx",
    });
    await repository.markJobRunning({
      ...scope,
      dispatchLeaseExpiresAt: new Date(now.getTime() + 1_000),
      dispatchLeaseOwner: "worker-a",
      jobId: queued.id,
    });

    expect(
      await repository.markJobCompleted({
        ...scope,
        completedAt: now,
        dispatchLeaseOwner: "worker-b",
        externalId: "olx-list-1",
        jobId: queued.id,
        listingId: "listing-1",
        provider: "olx",
      }),
    ).toBeNull();
    expect(
      await repository.recoverStaleRunningJobs({ limit: 10, now, scope }),
    ).toEqual([]);

    const recovered = await repository.recoverStaleRunningJobs({
      limit: 10,
      now: new Date(now.getTime() + 1_001),
      scope,
    });
    expect(recovered).toHaveLength(1);
    expect(recovered[0]).toMatchObject({
      id: queued.id,
      metadata: {
        reconciliationRequired: true,
        recoveryReason: "dispatch_lease_expired",
      },
      status: "submitted",
    });
    expect(
      await repository.markJobFailed({
        ...scope,
        completedAt: now,
        dispatchLeaseOwner: "worker-a",
        errorMessage: "late result",
        jobId: queued.id,
      }),
    ).toBeNull();
    expect(await repository.listQueuedJobIds({ limit: 10, scope })).toEqual([]);
  });

  it("allows only one terminal result for a running dispatch claim", async () => {
    const repository = await setupRepository();
    const queued = await repository.createSyncJob({
      ...scope,
      jobType: "listing_publish",
      metadata: { listingId: "listing-race" },
      provider: "olx",
    });
    await repository.markJobRunning({
      ...scope,
      dispatchLeaseExpiresAt: new Date(now.getTime() + 30_000),
      dispatchLeaseOwner: "worker-race",
      jobId: queued.id,
    });

    const results = await Promise.all([
      repository.markJobCompleted({
        ...scope,
        completedAt: now,
        dispatchLeaseOwner: "worker-race",
        externalId: "olx-list-race",
        jobId: queued.id,
        listingId: "listing-race",
        provider: "olx",
      }),
      repository.markJobFailed({
        ...scope,
        completedAt: now,
        dispatchLeaseOwner: "worker-race",
        errorMessage: "late failure",
        jobId: queued.id,
      }),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(["failed", "succeeded"]).toContain(
      (await repository.findSyncJob({ ...scope, jobId: queued.id }))?.status,
    );
  });
});

async function setupRepository() {
  const repository = createTestMarketplaceRepository();
  await repository.upsertAccount({
    ...scope,
    config: { connection: { providerAccountId: "provider-account-1" } },
    provider: "olx",
    providerAccountId: "provider-account-1",
    status: "active",
  });
  return repository;
}
