import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import { assertPermission } from "../../../../shared/authorization.js";
import type {
  MarketplaceJob,
  MarketplaceProvider,
  MarketplaceSyncJobType,
} from "../../ports/marketplaceRepository.js";
import {
  requireMarketplaceScope,
  type MarketplaceServicePorts,
} from "./serviceSupport.js";
import { permissionForMarketplaceJob } from "./marketplaceJobPermissions.js";

export type CreateMarketplaceSyncJobServiceInput = {
  jobType: MarketplaceSyncJobType;
  metadata?: Record<string, unknown>;
  provider: MarketplaceProvider;
};

export async function createMarketplaceSyncJob(
  context: ServiceContext,
  input: CreateMarketplaceSyncJobServiceInput,
  ports: MarketplaceServicePorts,
): Promise<MarketplaceJob> {
  const permission = permissionForMarketplaceJob(input.jobType);
  assertPermission(context, permission);
  const scope = requireMarketplaceScope(context);

  context.logger.info(
    "marketplace.sync_job.create.started",
    createServiceLogMetadata(context, {
      jobType: input.jobType,
      provider: input.provider,
    }),
  );

  const job = await ports.marketplaceRepository.createSyncJob({
    jobType: input.jobType,
    metadata: input.metadata ?? {},
    provider: input.provider,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });

  await context.audit.record({
    action: "marketplace.sync_job.create",
    actor: context.actor,
    category: "data_change",
    entityId: job.id,
    entityType: "marketplace_job",
    metadata: {
      jobType: input.jobType,
      permission,
      provider: input.provider,
      status: job.status,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Queued marketplace sync job",
  });

  return job;
}
