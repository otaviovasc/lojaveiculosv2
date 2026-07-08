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
import { runMarketplaceSyncJob } from "./runMarketplaceSyncJob.js";
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

  const createdJobs = [];
  for (const job of queuedJobs) {
    createdJobs.push(
      await runMarketplaceSyncJob(context, { jobId: job.id }, ports),
    );
  }

  const failed = createdJobs.filter((job) => job.status === "failed").length;
  const succeeded = createdJobs.filter(
    (job) => job.status === "succeeded",
  ).length;
  if (failed > 0 && succeeded > 0) {
    await recordPartialFailureAudit(context, {
      batchId,
      failed,
      provider: input.provider,
      scope,
      succeeded,
    });
  }

  return { batchId, createdJobs, plan, provider: input.provider };
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

async function recordPartialFailureAudit(
  context: ServiceContext,
  input: {
    batchId: string;
    failed: number;
    provider: MarketplaceProvider;
    scope: { storeId: string; tenantId: string };
    succeeded: number;
  },
) {
  await context.audit.record({
    action: "marketplace.stock_sync.partial_failure",
    actor: context.actor,
    category: "data_change",
    entityId: input.scope.storeId,
    entityType: "marketplace_stock_sync",
    metadata: {
      batchId: input.batchId,
      failed: input.failed,
      provider: input.provider,
      succeeded: input.succeeded,
    },
    outcome: "failed",
    requestId: context.requestId,
    storeId: input.scope.storeId,
    tenantId: input.scope.tenantId,
    summary: "Marketplace stock sync completed with partial failure",
  });
}
