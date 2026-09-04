import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import * as auditSchema from "@lojaveiculosv2/audit-db";
import * as productSchema from "@lojaveiculosv2/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { reconcileNextBillingProvider } from "../domains/billing/services/BillingService/reconcileBillingProvider.js";
import { createAsaasPaymentProviderGateway } from "../infrastructure/billing/asaasPaymentProviderGateway.js";
import {
  createDrizzleAuditSink,
  type DrizzleAuditSinkClient,
} from "../infrastructure/db/audit/drizzleAuditSink.js";
import { createDrizzleBillingProviderReconciliationRepository } from "../infrastructure/db/billing/drizzleBillingProviderReconciliation.js";
import { createDrizzleBillingAuditOutbox } from "../infrastructure/db/billing/drizzleBillingAuditOutbox.js";
import { createDrizzleBillingProviderRepository } from "../infrastructure/db/billing/drizzleBillingProviderRepository.js";
import { createDrizzleBillingWebhookRepository } from "../infrastructure/db/billing/drizzleBillingWebhookRepository.js";
import { fallbackExpiredPastDueSubscriptions } from "../infrastructure/db/billing/drizzleBillingPackagingCutover.js";
import {
  createDrizzleBillingRepository,
  type DrizzleBillingClient,
} from "../infrastructure/db/billing/drizzleBillingRepository.js";
import { loadLocalEnv } from "../infrastructure/config/loadLocalEnv.js";
import {
  createConsoleServiceLogger,
  createServiceContext,
} from "../shared/serviceContext.js";
import {
  billingMonitoringNeedsAttention,
  billingMonitoringSnapshot,
} from "./billingProviderReconciliationMonitoring.js";
import { replayPendingProviderEvents } from "./billingProviderEventReplay.js";
import { deliverBillingAuditOutbox } from "./billingAuditOutboxDelivery.js";

export {
  replayPendingProviderEvents,
  requeueExhaustedProviderEvent,
} from "./billingProviderEventReplay.js";

export { billingMonitoringSnapshot } from "./billingProviderReconciliationMonitoring.js";

loadLocalEnv();

const logger = createConsoleServiceLogger({
  component: "job.billing-provider-reconciliation",
  environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "unknown",
  service: "api",
});

async function main() {
  const sql = postgres(requireEnv("DATABASE_URL"), { max: 2 });
  const db = drizzle(sql, { schema: productSchema }) as DrizzleBillingClient;
  const audit = createAuditSink();
  const gateway = createAsaasPaymentProviderGateway(process.env);
  const environment = process.env.APP_ENV ?? process.env.NODE_ENV ?? "local";
  const ports = {
    billingProviderReconciliationRepository:
      createDrizzleBillingProviderReconciliationRepository(db),
    billingProviderRepository: createDrizzleBillingProviderRepository(db),
    billingRepository: createDrizzleBillingRepository(db),
    billingWebhookRepository: createDrizzleBillingWebhookRepository(db),
    environment,
    paymentProviderGateway: gateway,
  };
  let processed = 0;
  try {
    while (processed < 50) {
      const result = await reconcileNextBillingProvider(
        createServiceContext({
          actor: { id: "billing_provider_reconciliation", kind: "system" },
          ...(audit ? { audit: audit.sink } : {}),
          logger,
          permissions: ["billing.manage"],
          request: { requestId: `billing_reconcile_${randomUUID()}` },
          source: {
            component: "billing-provider-reconciliation",
            service: "api",
          },
        }),
        { now: new Date(), processingToken: randomUUID() },
        ports,
      );
      if (result.status === "idle") break;
      processed += 1;
    }
    const replayedProviderEvents = await replayPendingProviderEvents({
      ...(audit ? { audit: audit.sink } : {}),
      db,
      environment,
      ports,
    });
    const freeFallbacks = await fallbackExpiredPastDueSubscriptions(db);
    const auditOutbox = audit
      ? await deliverBillingAuditOutbox({
          audit: audit.sink,
          batchSize: 50,
          context: createServiceContext({
            actor: { id: "billing_audit_outbox", kind: "system" },
            audit: audit.sink,
            logger,
            permissions: ["billing.manage"],
            request: { requestId: `billing_audit_${randomUUID()}` },
            source: {
              component: "billing-audit-outbox",
              service: "api",
            },
          }),
          leaseDurationMs: 30_000,
          maxAttempts: 8,
          repository: createDrizzleBillingAuditOutbox(db),
        })
      : { claimed: 0, deadLettered: 0, delivered: 0, retried: 0 };
    if (!audit) {
      logger.error("alert.billing_audit_outbox.delivery_disabled", {
        reason: "audit_database_not_configured",
      });
    }
    const monitoring = await billingMonitoringSnapshot(db);
    logger.info("job.billing_provider_reconciliation.completed", {
      freeFallbacks,
      auditOutbox,
      ...monitoring,
      processed,
      replayedProviderEvents,
    });
    logger.info("metric.billing.lifecycle", monitoring);
    if (billingMonitoringNeedsAttention(monitoring)) {
      logger.error(
        "alert.billing_reconciliation.attention_required",
        monitoring,
      );
    }
  } finally {
    await sql.end();
    await audit?.close();
  }
}

function createAuditSink() {
  const url = process.env.AUDIT_DATABASE_URL;
  if (!url) return undefined;
  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema: auditSchema });
  return {
    close: () => client.end(),
    sink: createDrizzleAuditSink(db as unknown as DrizzleAuditSinkClient),
  };
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be configured.`);
  return value;
}

if (isDirectExecution()) {
  void main().catch((error) => {
    logger.error("job.billing_provider_reconciliation.failed", {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : "Error",
    });
    process.exitCode = 1;
  });
}

function isDirectExecution() {
  const entrypoint = process.argv[1];
  return Boolean(
    entrypoint && import.meta.url === pathToFileURL(entrypoint).href,
  );
}
