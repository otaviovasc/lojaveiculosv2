import { randomUUID } from "node:crypto";
import * as auditSchema from "@lojaveiculosv2/audit-db";
import * as productSchema from "@lojaveiculosv2/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { loadLocalEnv } from "../infrastructure/config/loadLocalEnv.js";
import {
  createDrizzleAuditSink,
  type DrizzleAuditSinkClient,
} from "../infrastructure/db/audit/drizzleAuditSink.js";
import { createDrizzleCrmRetentionRepository } from "../infrastructure/db/crm/drizzleCrmRetentionRepository.js";
import type { DrizzleCrmClient } from "../infrastructure/db/crm/drizzleCrmRepository.js";
import { toSafeErrorMetadata } from "../shared/errors/errorDescriptor.js";
import {
  createConsoleServiceLogger,
  createServiceContext,
} from "../shared/serviceContext.js";
import {
  deliverCrmRetentionAuditOutbox,
  executeCrmRetentionJob,
  readCrmRetentionJobConfig,
} from "./crmRetentionJob.js";
import {
  assertCrmRetentionSchemaReady,
  waitForCrmRetentionDatabases,
} from "./crmRetentionStartup.js";

loadLocalEnv();

const logger = createConsoleServiceLogger({
  component: "job.crm-retention",
  environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "unknown",
  service: "api",
});

async function main(): Promise<void> {
  const config = readCrmRetentionJobConfig(process.env);
  const productClient = postgres(requireEnv("DATABASE_URL"), { max: 2 });
  const auditClient = postgres(requireEnv("AUDIT_DATABASE_URL"), { max: 1 });
  const productDb = drizzle(productClient, { schema: productSchema });
  const auditDb = drizzle(auditClient, { schema: auditSchema });
  const audit = createDrizzleAuditSink(
    auditDb as unknown as DrizzleAuditSinkClient,
  );
  const repository = createDrizzleCrmRetentionRepository(
    productDb as DrizzleCrmClient,
  );
  const workerId = `crm_retention_${randomUUID()}`;
  try {
    await waitForCrmRetentionDatabases({
      auditClient,
      productClient,
      schemaProbe: () =>
        assertCrmRetentionSchemaReady({ auditClient, productClient }),
    });
    const auditBefore = await deliverCrmRetentionAuditOutbox({
      audit,
      leaseOwner: `${workerId}:audit-before`,
      limit: 500,
      repository,
    });
    const result = await executeCrmRetentionJob({
      config,
      context: (scope, batch) =>
        createServiceContext({
          actor: { id: "crm_retention_worker", kind: "system" },
          audit,
          logger,
          permissions: ["crm.manage"],
          request: {
            idempotencyKey: `${workerId}:${scope.tenantId}:${scope.storeId}:${batch}`,
            requestId: `crm_retention_${randomUUID()}`,
          },
          source: { component: "crm-retention-worker", service: "api" },
          storeId: scope.storeId,
          tenantId: scope.tenantId,
        }),
      leaseOwner: workerId,
      repository,
    });
    const auditAfter = await deliverCrmRetentionAuditOutbox({
      audit,
      leaseOwner: `${workerId}:audit-after`,
      limit: 500,
      repository,
    });
    logger.info("job.crm_retention.completed", {
      affectedCount: result.affected,
      auditDelivered: auditBefore.delivered + auditAfter.delivered,
      auditFailed: auditBefore.failed + auditAfter.failed,
      batches: result.batches,
      blockedScopes: result.blocked,
      dryRun: result.dryRun,
      eligibleCount: result.eligible,
      failedScopes: result.failed,
      legalHoldSkipped: result.legalHoldSkipped,
      scopes: result.scopes,
      truncatedScopes: result.truncated,
    });
    if (result.blocked > 0 || result.failed > 0) process.exitCode = 2;
  } finally {
    await productClient.end();
    await auditClient.end();
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.startsWith("${{")) {
    throw new Error(`${name} must be configured for CRM retention.`);
  }
  return value;
}

void main().catch((error) => {
  logger.error("job.crm_retention.failed", {
    ...toSafeErrorMetadata(error, {
      boundary: "crm_retention_worker",
      code: "CRM_RETENTION_JOB_FAILED",
    }),
  });
  process.exitCode = 1;
});
