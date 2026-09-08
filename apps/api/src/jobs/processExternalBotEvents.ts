import * as auditSchema from "@lojaveiculosv2/audit-db";
import {
  createDrizzleAuditSink,
  type DrizzleAuditSinkClient,
} from "../infrastructure/db/audit/drizzleAuditSink.js";
import { createDrizzleExternalBotDocumentPreparer } from "../infrastructure/db/crm/drizzleExternalBotDocumentPreparation.js";
import { createRuntimeObjectStorage } from "../infrastructure/db/runtimeObjectStorage.js";
import { createRuntimeCrmMessagingProviderGateway } from "../infrastructure/crm/crmMessagingProviderRouter.js";
import { createSafeCrmRemoteMediaFetcher } from "../infrastructure/crm/safeCrmRemoteMediaFetcher.js";
import { createConsoleServiceLogger } from "../shared/serviceContext.js";
import * as productSchema from "@lojaveiculosv2/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { loadLocalEnv } from "../infrastructure/config/loadLocalEnv.js";
import { createDrizzleExternalBotManager } from "../infrastructure/db/crm/drizzleExternalBotManager.js";
import { createHttpExternalBotEventSender } from "../infrastructure/crm/bot/httpExternalBotEventSender.js";
import { runExternalBotEventWorkerOnce } from "../infrastructure/crm/bot/runExternalBotEventWorker.js";

loadLocalEnv();

async function main() {
  const storage = createRuntimeObjectStorage(process.env);
  const auditClient = postgres(requireEnv("AUDIT_DATABASE_URL"), { max: 1 });
  const client = postgres(requireEnv("DATABASE_URL"), { max: 1 });
  try {
    const db = drizzle(client, { schema: productSchema });
    const manager = createDrizzleExternalBotManager({
      db,
      modelVersion: requireEnv("CRM_EXTERNAL_BOT_MODEL_VERSION"),
    });
    const result = await runExternalBotEventWorkerOnce({
      eventSigningKey: requireEnv("CRM_EXTERNAL_BOT_EVENT_SIGNING_KEY"),
      outbox: manager.eventOutbox,
      prepare: createDrizzleExternalBotDocumentPreparer({
        db,
        manager,
        storage,
        audit: createDrizzleAuditSink(
          drizzle(auditClient, {
            schema: auditSchema,
          }) as unknown as DrizzleAuditSinkClient,
        ),
        logger: createConsoleServiceLogger({
          component: "job.external-bot-events",
          service: "api",
        }),
        gateway: createRuntimeCrmMessagingProviderGateway(process.env),
        fetcher: createSafeCrmRemoteMediaFetcher(),
      }),
      sender: createHttpExternalBotEventSender({
        url: requireEnv("CRM_EXTERNAL_BOT_EVENT_URL"),
      }),
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    await Promise.all([
      client.end({ timeout: 5 }),
      auditClient.end({ timeout: 5 }),
      storage?.close?.(),
    ]);
  }
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

void main().catch((error) => {
  process.stderr.write(
    `${JSON.stringify({ errorName: error instanceof Error ? error.name : "UnknownError", status: "failed" })}\n`,
  );
  process.exitCode = 1;
});
