import { randomUUID } from "node:crypto";
import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  MarketplaceJob,
  MarketplaceJobScope,
} from "../../ports/marketplaceRepository.js";
import {
  boundedMarketplaceJobLimit,
  countMarketplaceJob,
  isStaleMarketplaceClaim,
  marketplaceRecoveryScope,
  queuedMarketplaceJobId,
} from "./marketplaceReconciliationSupport.js";
import { marketplaceJobNotFound } from "./marketplaceErrors.js";
import type {
  ProcessMarketplaceJobsInput,
  ProcessMarketplaceJobsResult,
} from "./marketplaceJobProcessingTypes.js";
import {
  marketplaceNow,
  type MarketplaceServicePorts,
} from "./serviceSupport.js";
import { runMarketplaceSyncJob } from "./runMarketplaceSyncJob.js";
import { reconcileMarketplaceClaim } from "./reconcileMarketplaceClaim.js";

export async function listMarketplaceProcessableJobScopes(
  context: ServiceContext,
  input: { limit?: number; now?: Date },
  ports: MarketplaceServicePorts,
): Promise<MarketplaceJobScope[]> {
  assertPermission(context, "marketplace.inventory_sync");
  return ports.marketplaceRepository.listProcessableJobScopes({
    limit: boundedMarketplaceJobLimit(input.limit, 100),
    now: input.now ?? marketplaceNow(ports),
  });
}

export async function processMarketplaceJobs(
  context: ServiceContext,
  input: ProcessMarketplaceJobsInput,
  ports: MarketplaceServicePorts,
): Promise<ProcessMarketplaceJobsResult> {
  assertPermission(context, "marketplace.inventory_sync");
  const scope = marketplaceRecoveryScope(context);
  const now = input.now ?? marketplaceNow(ports);
  const limit = boundedMarketplaceJobLimit(input.limit, 25);
  const result: ProcessMarketplaceJobsResult = {
    failed: 0,
    processed: 0,
    queued: 0,
    submitted: 0,
    succeeded: 0,
  };

  const recovered = await ports.marketplaceRepository.recoverStaleRunningJobs({
    limit,
    now,
    scope,
  });
  for (const job of recovered) countMarketplaceJob(result, job);

  const dispatchAllowed =
    !input.reconcileOnly &&
    Boolean(
      await ports.isMarketplaceEntitled?.({
        now,
        storeId: scope.storeId,
        tenantId: scope.tenantId,
      }),
    );
  const queuedIds = !dispatchAllowed
    ? []
    : input.jobId
      ? await queuedMarketplaceJobId(ports, scope, input.jobId)
      : await ports.marketplaceRepository.listQueuedJobIds({ limit, scope });
  for (const jobId of queuedIds) {
    try {
      const job = await runMarketplaceSyncJob(context, { jobId }, ports);
      countMarketplaceJob(result, job);
    } catch (error) {
      if (!isStaleMarketplaceClaim(error)) throw error;
    }
  }

  const claims = await ports.marketplaceRepository.claimSubmittedJobs({
    ...(input.force ? { force: true } : {}),
    ...(input.jobId ? { jobId: input.jobId } : {}),
    leaseExpiresAt: new Date(now.getTime() + 2 * 60_000),
    leaseOwner: randomUUID(),
    limit,
    now,
    ...scope,
  });
  for (const claim of claims) {
    const job = await reconcileMarketplaceClaim(
      context,
      claim,
      now,
      scope,
      ports,
    );
    countMarketplaceJob(result, job);
  }
  if (result.processed > 0) {
    context.logger.info(
      "marketplace.sync_jobs.processed",
      createServiceLogMetadata(context, {
        ...result,
        reconcileOnly: Boolean(input.reconcileOnly),
      }),
    );
    await context.audit.record({
      action: "marketplace.sync_jobs.processed",
      actor: context.actor,
      category: "integration",
      entityId: scope.storeId,
      entityType: "store",
      metadata: { ...result, reconcileOnly: Boolean(input.reconcileOnly) },
      outcome: result.failed > 0 ? "failed" : "succeeded",
      requestId: context.requestId,
      storeId: context.storeId,
      tenantId: context.tenantId,
      summary: "Processed marketplace publication jobs",
    });
  }
  return result;
}

export async function reconcileMarketplaceSyncJob(
  context: ServiceContext,
  input: { jobId: string },
  ports: MarketplaceServicePorts,
): Promise<MarketplaceJob> {
  const scope = marketplaceRecoveryScope(context);
  const current = await ports.marketplaceRepository.findSyncJob({
    jobId: input.jobId,
    ...scope,
  });
  if (!current) throw marketplaceJobNotFound(input.jobId);
  if (current.status !== "submitted") return current;
  await processMarketplaceJobs(
    context,
    { force: true, jobId: input.jobId, limit: 1, reconcileOnly: true },
    ports,
  );
  const job = await ports.marketplaceRepository.findSyncJob({
    jobId: input.jobId,
    ...scope,
  });
  if (!job) throw marketplaceJobNotFound(input.jobId);
  return job;
}
