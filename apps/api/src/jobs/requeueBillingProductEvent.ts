import { randomUUID } from "node:crypto";
import * as auditSchema from "@lojaveiculosv2/audit-db";
import * as productSchema from "@lojaveiculosv2/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { requeueBillingProductEvent } from "../domains/billing/services/BillingService/requeueBillingProductEvent.js";
import {
  createDrizzleAuditSink,
  type DrizzleAuditSinkClient,
} from "../infrastructure/db/audit/drizzleAuditSink.js";
import { createDrizzleBillingProductEventOutbox } from "../infrastructure/db/billing/drizzleBillingProductEventOutbox.js";
import type { DrizzleBillingClient } from "../infrastructure/db/billing/drizzleBillingRepository.js";
import { loadLocalEnv } from "../infrastructure/config/loadLocalEnv.js";
import {
  createConsoleServiceLogger,
  createServiceContext,
} from "../shared/serviceContext.js";

loadLocalEnv();

const logger = createConsoleServiceLogger({
  component: "job.billing-product-event-requeue",
  environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "unknown",
  service: "api",
});

async function main() {
  const eventId = requireUuid("BILLING_PRODUCT_EVENT_REQUEUE_EVENT_ID");
  const tenantId = requireUuid("BILLING_PRODUCT_EVENT_REQUEUE_TENANT_ID");
  const productClient = postgres(requireEnv("DATABASE_URL"), { max: 1 });
  const auditClient = postgres(requireEnv("AUDIT_DATABASE_URL"), { max: 1 });
  try {
    const productDb = drizzle(productClient, {
      schema: productSchema,
    }) as DrizzleBillingClient;
    const auditDb = drizzle(auditClient, { schema: auditSchema });
    const result = await requeueBillingProductEvent(
      createServiceContext({
        actor: { id: "billing_product_event_operator", kind: "system" },
        audit: createDrizzleAuditSink(
          auditDb as unknown as DrizzleAuditSinkClient,
        ),
        logger,
        permissions: ["billing.manage"],
        request: { requestId: `billing_event_requeue_${randomUUID()}` },
        source: {
          component: "billing-product-event-requeue",
          service: "api",
        },
        tenantId,
      }),
      { eventId },
      createDrizzleBillingProductEventOutbox(productDb),
    );
    logger.info("job.billing_product_event_requeue.completed", {
      eventId,
      result: result.kind,
      tenantId,
    });
  } finally {
    await Promise.all([productClient.end(), auditClient.end()]);
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be configured.`);
  return value;
}

function requireUuid(name: string): string {
  const value = requireEnv(name);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new Error(`${name} must be a UUID.`);
  }
  return value;
}

void main().catch((error) => {
  logger.error("job.billing_product_event_requeue.failed", {
    errorMessage: error instanceof Error ? error.message : String(error),
    errorName: error instanceof Error ? error.name : "Error",
  });
  process.exitCode = 1;
});
