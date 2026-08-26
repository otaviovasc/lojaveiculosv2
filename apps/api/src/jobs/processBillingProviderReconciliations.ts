import { randomUUID } from "node:crypto";
import * as auditSchema from "@lojaveiculosv2/audit-db";
import * as productSchema from "@lojaveiculosv2/db";
import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { reconcileNextBillingProvider } from "../domains/billing/services/BillingService/reconcileBillingProvider.js";
import { processBillingProviderWebhook } from "../domains/billing/services/BillingService/processBillingProviderWebhook.js";
import { createAsaasPaymentProviderGateway } from "../infrastructure/billing/asaasPaymentProviderGateway.js";
import {
  createDrizzleAuditSink,
  type DrizzleAuditSinkClient,
} from "../infrastructure/db/audit/drizzleAuditSink.js";
import { createDrizzleBillingProviderReconciliationRepository } from "../infrastructure/db/billing/drizzleBillingProviderReconciliation.js";
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
import { billingMonitoringSnapshot } from "./billingProviderReconciliationMonitoring.js";

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
    const monitoring = await billingMonitoringSnapshot(db);
    logger.info("job.billing_provider_reconciliation.completed", {
      freeFallbacks,
      ...monitoring,
      processed,
      replayedProviderEvents,
    });
    logger.info("metric.billing.lifecycle", monitoring);
    if (
      monitoring.activationOrProjectionFailureCount > 0 ||
      monitoring.missingContractCount > 0 ||
      monitoring.oldestPendingReconciliationAgeSeconds > 900 ||
      monitoring.reconciliationFailedHireCount > 0
    ) {
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

async function replayPendingProviderEvents(input: {
  audit?: ReturnType<typeof createDrizzleAuditSink>;
  db: DrizzleBillingClient;
  environment: string;
  ports: Parameters<typeof processBillingProviderWebhook>[2];
}) {
  const webhookToken = process.env.ASAAS_WEBHOOK_SECRET ?? null;
  if (!webhookToken) return 0;
  const events = await input.db
    .select({
      id: productSchema.providerEvents.id,
      payload: productSchema.providerEvents.payload,
    })
    .from(productSchema.providerEvents)
    .where(
      and(
        eq(productSchema.providerEvents.provider, "asaas"),
        eq(productSchema.providerEvents.environment, input.environment),
        eq(productSchema.providerEvents.status, "pending_reconciliation"),
      ),
    )
    .orderBy(asc(productSchema.providerEvents.createdAt))
    .limit(50);
  let replayed = 0;
  for (const event of events) {
    try {
      const result = await processBillingProviderWebhook(
        createServiceContext({
          actor: { id: "billing_provider_event_replay", kind: "system" },
          ...(input.audit ? { audit: input.audit } : {}),
          logger,
          permissions: ["billing.webhook.ingest"],
          request: { requestId: `billing_event_replay_${randomUUID()}` },
          source: {
            component: "billing-provider-event-replay",
            service: "api",
          },
        }),
        {
          payload: event.payload as Record<string, unknown>,
          provider: "asaas",
          webhookToken,
        },
        input.ports,
      );
      if (result.status === "processed") replayed += 1;
    } catch (error) {
      logger.error("job.billing_provider_event_replay.failed", {
        errorName: error instanceof Error ? error.name : "Error",
        providerEventRecordId: event.id,
      });
    }
  }
  return replayed;
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

void main().catch((error) => {
  logger.error("job.billing_provider_reconciliation.failed", {
    errorMessage: error instanceof Error ? error.message : String(error),
    errorName: error instanceof Error ? error.name : "Error",
  });
  process.exitCode = 1;
});
