import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { MarketplaceJob } from "../../ports/marketplaceRepository.js";
import { permissionForMarketplaceJob } from "./marketplaceJobPermissions.js";

export async function recordRunAudit(
  context: ServiceContext,
  job: MarketplaceJob,
  outcome: "failed" | "succeeded",
  errorMessage: string | null,
) {
  context.logger.info(
    "marketplace.sync_job.run",
    createServiceLogMetadata(context, {
      jobId: job.id,
      jobType: job.jobType,
      outcome,
      provider: job.provider,
    }),
  );

  await context.audit.record({
    action: "marketplace.sync_job.run",
    actor: context.actor,
    category: "data_change",
    entityId: job.id,
    entityType: "marketplace_job",
    metadata: {
      errorMessage,
      jobType: job.jobType,
      permission: permissionForMarketplaceJob(job.jobType),
      provider: job.provider,
      status: job.status,
    },
    outcome,
    requestId: context.requestId,
    storeId: context.storeId,
    tenantId: context.tenantId,
    summary: "Ran marketplace provider sync job",
  });

  await context.audit.record({
    action:
      outcome === "succeeded"
        ? "marketplace.sync_job.succeeded"
        : "marketplace.sync_job.failed",
    actor: context.actor,
    category: "data_change",
    entityId: job.id,
    entityType: "marketplace_job",
    metadata: {
      errorMessage,
      jobType: job.jobType,
      provider: job.provider,
      status: job.status,
    },
    outcome,
    requestId: context.requestId,
    storeId: context.storeId,
    tenantId: context.tenantId,
    summary:
      outcome === "succeeded"
        ? "Marketplace sync job succeeded"
        : "Marketplace sync job failed",
  });
}
