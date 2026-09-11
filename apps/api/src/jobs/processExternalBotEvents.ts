import * as auditSchema from "@lojaveiculosv2/audit-db";
import {
  createDrizzleAuditSink,
  type DrizzleAuditSinkClient,
} from "../infrastructure/db/audit/drizzleAuditSink.js";
import { createDrizzleExternalBotDocumentPreparer } from "../infrastructure/db/crm/drizzleExternalBotDocumentPreparation.js";
import { createDrizzleCrmExternalBotIntegrationRepository } from "../infrastructure/db/crm/drizzleCrmExternalBotIntegrationRepository.js";
import { createRuntimeObjectStorage } from "../infrastructure/db/runtimeObjectStorage.js";
import { openSealedCrmConnectionCredential } from "../infrastructure/crm/crmConnectionCredentialVault.js";
import { createRuntimeCrmMessagingProviderGateway } from "../infrastructure/crm/crmMessagingProviderRouter.js";
import { createSafeCrmRemoteMediaFetcher } from "../infrastructure/crm/safeCrmRemoteMediaFetcher.js";
import { createConsoleServiceLogger } from "../shared/serviceContext.js";
import { CRM_EXTERNAL_BOT_WEBHOOK_SECRET_CREDENTIAL_PURPOSE } from "../domains/crm/ports/crmConnectionSetupProvider.js";
import type { ExternalBotEvent } from "../domains/crm/bot/externalBotModels.js";
import * as productSchema from "@lojaveiculosv2/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { loadLocalEnv } from "../infrastructure/config/loadLocalEnv.js";
import { createDrizzleExternalBotManager } from "../infrastructure/db/crm/drizzleExternalBotManager.js";
import { createHttpExternalBotEventSender } from "../infrastructure/crm/bot/httpExternalBotEventSender.js";
import type { ExternalBotDeliveryResolution } from "../infrastructure/crm/bot/externalBotEventOutboxDispatcher.js";
import { runExternalBotEventWorkerOnce } from "../infrastructure/crm/bot/runExternalBotEventWorker.js";

loadLocalEnv();

async function main() {
  const storage = createObjectStorageOrNull(process.env);
  const auditClient = postgres(requireEnv("AUDIT_DATABASE_URL"), { max: 1 });
  const client = postgres(requireEnv("DATABASE_URL"), { max: 1 });
  try {
    const db = drizzle(client, { schema: productSchema });
    const manager = createDrizzleExternalBotManager({
      db,
      modelVersion: requireEnv("CRM_EXTERNAL_BOT_MODEL_VERSION"),
    });
    const integrations = createDrizzleCrmExternalBotIntegrationRepository(db);
    const resolveDelivery = async (
      event: ExternalBotEvent,
    ): Promise<ExternalBotDeliveryResolution> => {
      const config =
        await integrations.findExternalBotIntegrationDeliveryConfig({
          storeId: event.storeId as never,
          tenantId: event.tenantId as never,
        });
      if (!config?.enabled || !config.webhookUrl) {
        return {
          code: "integration_not_configured",
          kind: "undeliverable",
          retryable: false,
        };
      }
      if (!config.webhookSecretSealed) {
        return {
          code: "webhook_secret_missing",
          kind: "undeliverable",
          retryable: false,
        };
      }
      try {
        const secret = await openSealedCrmConnectionCredential({
          purpose: CRM_EXTERNAL_BOT_WEBHOOK_SECRET_CREDENTIAL_PURPOSE,
          sealed: config.webhookSecretSealed,
          storeId: event.storeId as never,
          tenantId: event.tenantId as never,
        });
        return {
          kind: "ready",
          secret,
          sender: createHttpExternalBotEventSender({ url: config.webhookUrl }),
        };
      } catch {
        return {
          code: "webhook_secret_unseal_failed",
          kind: "undeliverable",
          retryable: false,
        };
      }
    };
    const prepare = createDrizzleExternalBotDocumentPreparer({
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
    });
    const batchSize = readBatchSize(process.env);
    const results: unknown[] = [];
    for (let index = 0; index < batchSize; index += 1) {
      const result = await runExternalBotEventWorkerOnce({
        outbox: manager.eventOutbox,
        prepare,
        resolveDelivery,
      });
      if (result.kind === "idle") break;
      results.push(result);
    }
    process.stdout.write(
      `${JSON.stringify({ processed: results.length, results })}\n`,
    );
  } finally {
    await Promise.all([
      client.end({ timeout: 5 }),
      auditClient.end({ timeout: 5 }),
      storage?.close?.(),
    ]);
  }
}

function createObjectStorageOrNull(env: Record<string, string | undefined>) {
  try {
    return createRuntimeObjectStorage(env);
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({ errorName: error instanceof Error ? error.name : "UnknownError", event: "object_storage_unavailable", status: "degraded" })}\n`,
    );
    return null;
  }
}

function readBatchSize(env: Record<string, string | undefined>) {
  const raw = Number(env.CRM_EXTERNAL_BOT_EVENT_BATCH_SIZE ?? "25");
  if (!Number.isInteger(raw) || raw < 1) return 25;
  return Math.min(raw, 200);
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

void main().catch((error) => {
  process.stderr.write(
    `${JSON.stringify({ errorName: error instanceof Error ? error.name : "UnknownError", message: error instanceof Error ? error.message : null, status: "failed" })}\n`,
  );
  process.exitCode = 1;
});
