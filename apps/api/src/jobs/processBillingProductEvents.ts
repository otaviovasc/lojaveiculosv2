import * as productSchema from "@lojaveiculosv2/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createBillingProductEventHttpSink } from "../infrastructure/billing/billingProductEventHttpSink.js";
import { runBillingProductEventWorker } from "../infrastructure/billing/runBillingProductEventWorker.js";
import { reportBillingProductEventHealth } from "../infrastructure/billing/reportBillingProductEventHealth.js";
import { createDrizzleBillingProductEventOutbox } from "../infrastructure/db/billing/drizzleBillingProductEventOutbox.js";
import type { DrizzleBillingClient } from "../infrastructure/db/billing/drizzleBillingRepository.js";
import { loadLocalEnv } from "../infrastructure/config/loadLocalEnv.js";
import { createConsoleServiceLogger } from "../shared/serviceContext.js";

loadLocalEnv();

const logger = createConsoleServiceLogger({
  component: "job.billing-product-events",
  environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "unknown",
  service: "api",
});

async function main() {
  const sql = postgres(requireEnv("DATABASE_URL"), { max: 2 });
  try {
    const db = drizzle(sql, { schema: productSchema }) as DrizzleBillingClient;
    const repository = createDrizzleBillingProductEventOutbox(db);
    const sink = createBillingProductEventHttpSink(process.env);
    const maxPendingAgeSeconds = positiveInt(
      "BILLING_PRODUCT_EVENT_MAX_PENDING_AGE_SECONDS",
      900,
    );
    if (!sink) {
      const snapshot = await repository.snapshot(new Date());
      logger.warn("billing.product_event.worker_disabled", {
        ...snapshot,
        reason: "sink_not_configured",
      });
      reportBillingProductEventHealth({
        logger,
        maxPendingAgeSeconds,
        snapshot,
      });
      return;
    }
    const result = await runBillingProductEventWorker({
      batchSize: positiveInt("BILLING_PRODUCT_EVENT_BATCH_SIZE", 50),
      leaseDurationMs: positiveInt(
        "BILLING_PRODUCT_EVENT_LEASE_DURATION_MS",
        30_000,
      ),
      logger,
      maxAttempts: positiveInt("BILLING_PRODUCT_EVENT_MAX_ATTEMPTS", 10),
      repository,
      sink,
    });
    const snapshot = await repository.snapshot(new Date());
    logger.info("billing.product_event.worker_completed", {
      ...result,
      ...snapshot,
    });
    reportBillingProductEventHealth({
      logger,
      maxPendingAgeSeconds,
      snapshot,
    });
  } finally {
    await sql.end();
  }
}

function positiveInt(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be configured.`);
  return value;
}

void main().catch((error) => {
  logger.error("job.billing_product_event.failed", {
    errorMessage: error instanceof Error ? error.message : String(error),
    errorName: error instanceof Error ? error.name : "Error",
  });
  process.exitCode = 1;
});
