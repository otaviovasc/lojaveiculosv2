import * as auditSchema from "@lojaveiculosv2/audit-db";
import * as productSchema from "@lojaveiculosv2/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { loadLocalEnv } from "../infrastructure/config/loadLocalEnv.js";
import { createRuntimeCrmServices } from "../infrastructure/db/runtimeCrmServices.js";
import {
  createDrizzleAuditSink,
  type DrizzleAuditSinkClient,
} from "../infrastructure/db/audit/drizzleAuditSink.js";
import { createExternalBotProviderEffectExecutor } from "../infrastructure/crm/bot/externalBotProviderEffectExecutor.js";
import { runExternalBotEffectWorkerOnce } from "../infrastructure/crm/bot/runExternalBotEffectWorker.js";
import { loadAuthorizedExternalBotEffect } from "../infrastructure/db/crm/drizzleExternalBotEffectRuntime.js";
import { createConsoleServiceLogger } from "../shared/serviceContext.js";

loadLocalEnv();

const logger = createConsoleServiceLogger({
  component: "job.external-bot-effects",
  environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "unknown",
  service: "api",
});

async function main() {
  const productClient = postgres(requireEnv("DATABASE_URL"), { max: 1 });
  const auditClient = postgres(requireEnv("AUDIT_DATABASE_URL"), { max: 1 });
  try {
    const db = drizzle(productClient, { schema: productSchema });
    const auditDb = drizzle(auditClient, { schema: auditSchema });
    const audit = createDrizzleAuditSink(
      auditDb as unknown as DrizzleAuditSinkClient,
    );
    const services = createRuntimeCrmServices(db, process.env);
    const executor = createExternalBotProviderEffectExecutor({
      audit,
      db,
      logger,
      services,
    });
    const limit = readBatchSize();
    let processed = 0;
    for (; processed < limit; processed += 1) {
      const result = await runExternalBotEffectWorkerOnce({
        authorize: async (effectId) =>
          Boolean(await loadAuthorizedExternalBotEffect(db, effectId)),
        db,
        executor,
      });
      if (result.kind === "idle") break;
    }
    logger.info("crm.bot.effects.worker.finished", { processed });
  } finally {
    await Promise.all([
      productClient.end({ timeout: 5 }),
      auditClient.end({ timeout: 5 }),
    ]);
  }
}

function readBatchSize() {
  const value = Number(process.env.CRM_EXTERNAL_BOT_EFFECT_BATCH_SIZE ?? 25);
  return Number.isInteger(value) && value > 0 && value <= 100 ? value : 25;
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

void main().catch((error) => {
  logger.error("job.external_bot_effects.failed", {
    errorName: error instanceof Error ? error.name : "UnknownError",
  });
  process.exitCode = 1;
});
