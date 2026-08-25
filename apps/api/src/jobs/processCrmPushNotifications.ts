import * as productSchema from "@lojaveiculosv2/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { loadLocalEnv } from "../infrastructure/config/loadLocalEnv.js";
import {
  createOneSignalHttpClient,
  createShadowCrmPushDeliveryProvider,
} from "../infrastructure/crm/onesignalHttpClient.js";
import { readCrmPushRuntimeConfig } from "../infrastructure/crm/push/crmPushRuntimeConfig.js";
import { drainDisabledCrmPushIntents } from "../infrastructure/crm/push/drainDisabledCrmPushIntents.js";
import { runCrmPushWorkerOnce } from "../infrastructure/crm/push/runCrmPushWorkerOnce.js";
import { createDrizzleCrmPushRepository } from "../infrastructure/db/crm/drizzleCrmPushRepository.js";
import { cleanupTerminalCrmPushIntents } from "../infrastructure/db/crm/cleanupTerminalCrmPushIntents.js";
import type { DrizzleCrmClient } from "../infrastructure/db/crm/drizzleCrmRepository.js";
import { createConsoleServiceLogger } from "../shared/serviceContext.js";

loadLocalEnv();

const logger = createConsoleServiceLogger({
  component: "job.crm-push-notifications",
  environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "unknown",
  service: "api",
});

async function main() {
  const config = readCrmPushRuntimeConfig(process.env);
  const client = postgres(requireEnv("DATABASE_URL"), { max: 1 });
  try {
    const db = drizzle(client, { schema: productSchema }) as DrizzleCrmClient;
    const repository = createDrizzleCrmPushRepository(db);
    if (config.deliveryMode === "off") {
      const result = await drainDisabledCrmPushIntents({
        batchSize: config.batchSize,
        leaseDurationMs: config.leaseDurationMs,
        repository,
      });
      logger.info("crm.push.worker.disabled_drained", result);
    } else {
      const publicAppUrl = requireEnv("PUBLIC_APP_URL");
      const provider =
        config.deliveryMode === "live"
          ? createOneSignalHttpClient({
              apiKey: config.apiKey!,
              appId: config.appId!,
              requestTimeoutMs: config.requestTimeoutMs,
            })
          : createShadowCrmPushDeliveryProvider();
      const result = await runCrmPushWorkerOnce({
        batchSize: config.batchSize,
        leaseDurationMs: config.leaseDurationMs,
        maxAttempts: config.maxAttempts,
        provider,
        publicAppUrl,
        repository,
      });
      logger.info("crm.push.worker.finished", {
        ...result,
        deliveryMode: config.deliveryMode,
      });
    }
    const cleanupCount = await cleanupTerminalCrmPushIntents(db, {
      cutoff: new Date(
        Date.now() - config.terminalRetentionDays * 24 * 60 * 60 * 1_000,
      ),
      limit: config.cleanupBatchSize,
    });
    logger.info("crm.push.worker.cleanup_finished", { cleanupCount });
  } finally {
    await client.end({ timeout: 5 });
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

void main().catch((error) => {
  logger.error("crm.push.worker.failed", {
    errorName: error instanceof Error ? error.name : "UnknownError",
  });
  process.exitCode = 1;
});
