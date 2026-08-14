import { randomUUID } from "node:crypto";
import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  MarketplaceJob,
  MarketplaceProvider,
} from "../../ports/marketplaceRepository.js";
import { createMarketplaceSyncJob } from "./createMarketplaceSyncJob.js";
import {
  planMarketplaceStockSync,
  type MarketplaceStockPlan,
} from "./planMarketplaceStockSync.js";
import {
  requireMarketplaceScope,
  type MarketplaceServicePorts,
} from "./serviceSupport.js";

export type MarketplaceStockSyncPreviewInput = {
  listingIds?: readonly string[];
  provider: MarketplaceProvider;
};

export type MarketplaceStockSyncPreviewResult = {
  batchId: string;
  plan: MarketplaceStockPlan;
  provider: MarketplaceProvider;
};

export type MarketplaceStockSyncRunInput = MarketplaceStockSyncPreviewInput & {
  batchId?: string;
};

export type MarketplaceStockSyncRunResult = {
  batchId: string;
  createdJobs: MarketplaceJob[];
  plan: MarketplaceStockPlan;
  provider: MarketplaceProvider;
};

export async function previewMarketplaceStockSync(
  context: ServiceContext,
  input: MarketplaceStockSyncPreviewInput,
  ports: MarketplaceServicePorts,
): Promise<MarketplaceStockSyncPreviewResult> {
  assertPermission(context, "marketplace.inventory_sync");
  return {
    batchId: randomUUID(),
    plan: await planMarketplaceStockSync(context, input, ports),
    provider: input.provider,
  };
}

export async function runMarketplaceStockSync(
  context: ServiceContext,
  input: MarketplaceStockSyncRunInput,
  ports: MarketplaceServicePorts,
): Promise<MarketplaceStockSyncRunResult> {
  assertPermission(context, "marketplace.inventory_sync");
  const scope = requireMarketplaceScope(context);
  const batchId = input.batchId ?? randomUUID();
  const plan = await planMarketplaceStockSync(context, input, ports);
  const queuedJobs = await Promise.all(
    plan.items
      .filter((item) => item.jobType)
      .map((item) =>
        createMarketplaceSyncJob(
          context,
          {
            jobType: item.jobType!,
            metadata: {
              batchId,
              ...(item.externalId ? { externalId: item.externalId } : {}),
              listingId: item.listing.listingId,
              planDecision: item.decision,
              ...(item.providerMapping
                ? { providerMapping: item.providerMapping }
                : {}),
              stockSync: true,
            },
            provider: input.provider,
          },
          ports,
        ),
      ),
  );

  await recordQueueAudit(context, {
    batchId,
    jobCount: queuedJobs.length,
    provider: input.provider,
    scope,
  });

  return {
    batchId,
    createdJobs: queuedJobs,
    plan,
    provider: input.provider,
  };
}

async function recordQueueAudit(
  context: ServiceContext,
  input: {
    batchId: string;
    jobCount: number;
    provider: MarketplaceProvider;
    scope: { storeId: string; tenantId: string };
  },
) {
  context.logger.info(
    "marketplace.stock_sync.queue",
    createServiceLogMetadata(context, {
      batchId: input.batchId,
      jobCount: input.jobCount,
      provider: input.provider,
    }),
  );

  await context.audit.record({
    action: "marketplace.stock_sync.queue",
    actor: context.actor,
    category: "data_change",
    entityId: input.scope.storeId,
    entityType: "marketplace_stock_sync",
    metadata: {
      batchId: input.batchId,
      jobCount: input.jobCount,
      permission: "marketplace.inventory_sync",
      provider: input.provider,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: input.scope.storeId,
    tenantId: input.scope.tenantId,
    summary: "Queued marketplace stock sync jobs",
  });
}
