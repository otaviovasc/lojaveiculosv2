import { randomUUID } from "node:crypto";
import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import {
  MarketplaceProviderRuntimeError,
  type MarketplaceServicePorts,
} from "./serviceSupport.js";
import { MarketplaceServiceError } from "./marketplaceErrors.js";
import { permissionForMarketplaceJob } from "./marketplaceJobPermissions.js";

export async function claimMarketplaceSyncJob(
  context: ServiceContext,
  input: { jobId: string },
  scope: { storeId: string; tenantId: string },
  ports: MarketplaceServicePorts,
) {
  const queuedJob = await ports.marketplaceRepository.findSyncJob({
    jobId: input.jobId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!queuedJob) throw new MarketplaceProviderRuntimeError("Job missing.");
  if (queuedJob.status !== "queued") {
    throw new MarketplaceServiceError({
      code: "MARKETPLACE_SYNC_JOB_STALE",
      details: { jobId: queuedJob.id, status: queuedJob.status },
      jobId: queuedJob.id,
      message: "Marketplace sync job is not queued.",
      provider: queuedJob.provider,
      status: 409,
      userAction: "Create or retry a fresh marketplace sync job.",
    });
  }
  assertPermission(context, permissionForMarketplaceJob(queuedJob.jobType));
  context.logger.info(
    "marketplace.sync_job.run.started",
    createServiceLogMetadata(context, {
      jobId: queuedJob.id,
      jobType: queuedJob.jobType,
      provider: queuedJob.provider,
    }),
  );
  const dispatchLeaseOwner = randomUUID();
  const runningJob = await ports.marketplaceRepository.markJobRunning({
    dispatchLeaseExpiresAt: new Date(Date.now() + 2 * 60_000),
    dispatchLeaseOwner,
    jobId: input.jobId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (runningJob) return { dispatchLeaseOwner, job: runningJob };
  throw new MarketplaceServiceError({
    code: "MARKETPLACE_SYNC_JOB_STALE",
    details: { jobId: queuedJob.id },
    jobId: queuedJob.id,
    message: "Marketplace sync job was already claimed.",
    provider: queuedJob.provider,
    status: 409,
    userAction: "Wait for the current marketplace sync job to finish.",
  });
}
