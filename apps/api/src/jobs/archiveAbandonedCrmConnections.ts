import { loadLocalEnv } from "../infrastructure/config/loadLocalEnv.js";
import { createRuntimeAppDependencies } from "../infrastructure/db/runtimeRepositories.js";
import {
  createConsoleServiceLogger,
  createServiceContext,
} from "../shared/serviceContext.js";

loadLocalEnv();

const logger = createConsoleServiceLogger({
  component: "job.crm-connection-cleanup",
  environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "unknown",
  service: "api",
});

async function main() {
  const runtime = createRuntimeAppDependencies();
  try {
    const services = runtime.appOptions.crmServices;
    if (!services) throw new Error("CRM services are unavailable.");
    const context = createServiceContext({
      actor: { id: "crm_connection_cleanup_worker", kind: "system" },
      ...(runtime.appOptions.audit ? { audit: runtime.appOptions.audit } : {}),
      logger,
      permissions: ["crm.messaging.connection.setup"],
      request: { requestId: `crm_connection_cleanup_${Date.now()}` },
      source: { component: "crm-connection-cleanup-worker", service: "api" },
    });
    const result = await services.archiveAbandonedZapiConnections(context, {
      limit: readLimit(),
    });
    logger.info("crm.connection.cleanup.worker.finished", {
      archivedCount: result.archived,
      cutoff: result.cutoff.toISOString(),
    });
  } finally {
    await runtime.close();
  }
}

function readLimit() {
  const parsed = Number(process.env.CRM_CONNECTION_CLEANUP_BATCH_SIZE);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 500) : 100;
}

void main().catch((error) => {
  logger.error("crm.connection.cleanup.worker.failed", {
    errorName: error instanceof Error ? error.name : "UnknownError",
  });
  process.exitCode = 1;
});
