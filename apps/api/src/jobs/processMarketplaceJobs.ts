import type { AuditSink } from "@lojaveiculosv2/audit";
import { loadLocalEnv } from "../infrastructure/config/loadLocalEnv.js";
import { createRuntimeAppDependencies } from "../infrastructure/db/runtimeRepositories.js";
import type { MarketplaceServices } from "../features/marketplaces/controllers/marketplaceServices.js";
import {
  createConsoleServiceLogger,
  createServiceContext,
  type ServiceContext,
  type ServiceLogger,
  type StoreScopedServiceContext,
} from "../shared/serviceContext.js";

loadLocalEnv();

const logger = createConsoleServiceLogger({
  component: "job.marketplace-reconciliation",
  environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "unknown",
  service: "api",
});

async function main() {
  const runtime = createRuntimeAppDependencies();
  try {
    const services = runtime.appOptions.marketplaceServices;
    if (!services) throw new Error("Marketplace services are unavailable.");
    const now = new Date();
    const result = await processScopes({
      ...(runtime.appOptions.audit ? { audit: runtime.appOptions.audit } : {}),
      batchSize: positiveInt("MARKETPLACE_JOB_BATCH_SIZE", 25),
      logger,
      now,
      scopeLimit: positiveInt("MARKETPLACE_JOB_SCOPE_LIMIT", 100),
      services,
    });
    logger.info("marketplace.jobs.worker.finished", result);
  } finally {
    await runtime.close();
  }
}

async function processScopes(input: {
  audit?: AuditSink;
  batchSize: number;
  logger: ServiceLogger;
  now: Date;
  scopeLimit: number;
  services: MarketplaceServices;
}) {
  const discovery = workerContext(input, "marketplace_job_discovery");
  const scopes = await input.services.listProcessableJobScopes(discovery, {
    limit: input.scopeLimit,
    now: input.now,
  });
  const totals = {
    failed: 0,
    processed: 0,
    scopes: scopes.length,
    submitted: 0,
    succeeded: 0,
  };
  for (const scope of scopes) {
    const context = workerStoreContext(input, scope);
    try {
      const result = await input.services.processJobs(context, {
        limit: input.batchSize,
        now: input.now,
      });
      totals.failed += result.failed;
      totals.processed += result.processed;
      totals.submitted += result.submitted;
      totals.succeeded += result.succeeded;
    } catch (error) {
      totals.failed += 1;
      input.logger.error("marketplace.jobs.scope.failed", {
        errorMessage: error instanceof Error ? error.message : String(error),
        storeId: scope.storeId,
        tenantId: scope.tenantId,
      });
    }
  }
  return totals;
}

function workerContext(
  input: { audit?: AuditSink; logger: ServiceLogger },
  requestId: string,
): ServiceContext {
  return createServiceContext({
    actor: { id: "marketplace_reconciliation_worker", kind: "system" },
    ...(input.audit ? { audit: input.audit } : {}),
    logger: input.logger,
    permissions: ["marketplace.inventory_sync"],
    request: { requestId: `${requestId}_${Date.now()}` },
    source: { component: "marketplace-reconciliation-worker", service: "api" },
  });
}

function workerStoreContext(
  input: { audit?: AuditSink; logger: ServiceLogger },
  scope: { storeId: string; tenantId: string },
): StoreScopedServiceContext {
  const context = createServiceContext({
    actor: { id: "marketplace_reconciliation_worker", kind: "system" },
    ...(input.audit ? { audit: input.audit } : {}),
    logger: input.logger,
    permissions: [
      "marketplace.inventory_sync",
      "marketplace.listing_publish",
      "marketplace.listing_unpublish",
      "marketplace.listing_update",
    ],
    request: { requestId: `marketplace_jobs_${scope.storeId}_${Date.now()}` },
    source: { component: "marketplace-reconciliation-worker", service: "api" },
    ...scope,
  });
  return { ...context, entitlements: ["marketplace"], ...scope };
}

function positiveInt(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

void main().catch((error) => {
  logger.error("job.marketplace_reconciliation.failed", {
    errorMessage: error instanceof Error ? error.message : String(error),
    errorName: error instanceof Error ? error.name : "Error",
  });
  process.exitCode = 1;
});
