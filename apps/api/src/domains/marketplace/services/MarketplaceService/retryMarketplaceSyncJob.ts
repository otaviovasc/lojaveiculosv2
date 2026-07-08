import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { MarketplaceJob } from "../../ports/marketplaceRepository.js";
import { createMarketplaceSyncJob } from "./createMarketplaceSyncJob.js";
import { MarketplaceServiceError } from "./marketplaceErrors.js";
import { runMarketplaceSyncJob } from "./runMarketplaceSyncJob.js";
import {
  requireMarketplaceScope,
  type MarketplaceServicePorts,
} from "./serviceSupport.js";

export type RetryMarketplaceSyncJobInput = {
  jobId: string;
  reason?: string;
};

export type RetryMarketplaceSyncJobResult = {
  job: MarketplaceJob;
  previousJobId: string;
};

export async function retryMarketplaceSyncJob(
  context: ServiceContext,
  input: RetryMarketplaceSyncJobInput,
  ports: MarketplaceServicePorts,
): Promise<RetryMarketplaceSyncJobResult> {
  assertPermission(context, "marketplace.inventory_sync");
  const scope = requireMarketplaceScope(context);
  context.logger.info(
    "marketplace.sync_job.retry.started",
    createServiceLogMetadata(context, { jobId: input.jobId }),
  );
  const previous = await ports.marketplaceRepository.findSyncJob({
    jobId: input.jobId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!previous) {
    throw new MarketplaceServiceError({
      code: "MARKETPLACE_SYNC_JOB_NOT_RETRYABLE",
      message: "Marketplace sync job was not found.",
      status: 404,
      userAction: "Choose a failed marketplace sync job and try again.",
    });
  }
  if (previous.status !== "failed") {
    throw new MarketplaceServiceError({
      code: "MARKETPLACE_SYNC_JOB_NOT_RETRYABLE",
      details: { jobId: previous.id, status: previous.status },
      jobId: previous.id,
      message: "Marketplace sync job is not retryable.",
      provider: previous.provider,
      status: 409,
      userAction: "Only failed marketplace sync jobs can be retried.",
    });
  }

  const metadata = retryMetadata(previous);
  const queued = await createMarketplaceSyncJob(
    context,
    {
      jobType: previous.jobType,
      metadata: {
        ...metadata,
        retryOfJobId: previous.id,
      },
      provider: previous.provider,
    },
    ports,
  );

  await context.audit.record({
    action: "marketplace.sync_job.retry",
    actor: context.actor,
    category: "data_change",
    entityId: queued.id,
    entityType: "marketplace_job",
    metadata: {
      jobType: queued.jobType,
      previousJobId: previous.id,
      provider: queued.provider,
      reasonProvided: Boolean(input.reason),
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Retried marketplace sync job",
  });

  return {
    job: await runMarketplaceSyncJob(context, { jobId: queued.id }, ports),
    previousJobId: previous.id,
  };
}

function retryMetadata(job: MarketplaceJob) {
  const listingId = readString(job.metadata.listingId);
  if (!listingId) {
    throw new MarketplaceServiceError({
      code: "MARKETPLACE_SYNC_JOB_INVALID_METADATA",
      details: { jobId: job.id, missing: ["listingId"] },
      jobId: job.id,
      message: "Marketplace sync job metadata is invalid.",
      provider: job.provider,
      status: 400,
      userAction: "Create a new stock sync job for this listing.",
    });
  }
  return {
    ...(readString(job.metadata.batchId)
      ? { batchId: readString(job.metadata.batchId)! }
      : {}),
    ...(readString(job.metadata.externalId)
      ? { externalId: readString(job.metadata.externalId)! }
      : {}),
    listingId,
    ...(readPlanDecision(job.metadata.planDecision)
      ? { planDecision: readPlanDecision(job.metadata.planDecision)! }
      : {}),
    ...(job.metadata.stockSync === true ? { stockSync: true as const } : {}),
  };
}

function readPlanDecision(value: unknown) {
  return value === "publish" ||
    value === "update" ||
    value === "unpublish" ||
    value === "no_op" ||
    value === "blocked"
    ? value
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
