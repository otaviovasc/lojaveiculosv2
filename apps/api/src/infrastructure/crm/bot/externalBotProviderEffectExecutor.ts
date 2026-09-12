import type { AuditSink } from "@lojaveiculosv2/audit";
import type * as schema from "@lojaveiculosv2/db";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { CrmMessagingGateway } from "../../../domains/crm/ports/crmMessagingGateway.js";
import type { CrmAudioNormalizer } from "../../../domains/crm/ports/crmAudioNormalizer.js";
import type { CrmRemoteMediaFetcher } from "../../../domains/crm/ports/crmRemoteMediaFetcher.js";
import {
  resolveCrmProviderOperation,
  type CrmProviderOperationPorts,
} from "../../../domains/crm/services/CrmRoutingService/resolveCrmProviderOperation.js";
import {
  createServiceContext,
  type ServiceContext,
} from "../../../shared/serviceContext.js";
import type { ServiceLogger } from "../../../shared/serviceLogger.js";
import type { ObjectStorage } from "../../../shared/storage/objectStorage.js";
import { prepareExternalBotMedia } from "./externalBotMediaPreparation.js";
import {
  failureCode,
  permanentFailure,
  providerFailure,
  sendProviderCommand,
  toProviderOperation,
} from "./externalBotProviderEffectSupport.js";
import type { ExternalBotProviderEffectExecutor } from "./runExternalBotEffectWorker.js";
import {
  loadAuthorizedExternalBotEffect,
  synchronizeExternalBotEffectOutcome,
  wasExternalBotProviderAttempted,
  type AuthorizedExternalBotEffect,
} from "../../db/crm/drizzleExternalBotEffectRuntime.js";

type Db = PostgresJsDatabase<typeof schema>;

export function createExternalBotProviderEffectExecutor(input: {
  audit?: AuditSink;
  audioNormalizer?: CrmAudioNormalizer;
  db: Db;
  gateway: Pick<CrmMessagingGateway, "sendMedia" | "sendTemplate" | "sendText">;
  logger: ServiceLogger;
  mediaFetcher?: CrmRemoteMediaFetcher;
  mediaStorage?: ObjectStorage;
  providerOperationPorts: CrmProviderOperationPorts;
}): ExternalBotProviderEffectExecutor {
  return {
    execute: async ({ effectId }) => {
      const preview = await loadAuthorizedExternalBotEffect(
        input.db,
        effectId,
        {
          markProviderAttempt: false,
        },
      );
      if (!preview) return missingEffectResult(input.db, effectId);
      if (
        !preview.providerOperation &&
        (await wasExternalBotProviderAttempted(input.db, effectId))
      ) {
        return providerAttemptIndeterminate();
      }
      const context = effectContext(input, preview);
      try {
        await auditEffect(context, preview, "attempted");
        await prepareExternalBotMedia({
          ...(input.audioNormalizer
            ? { audioNormalizer: input.audioNormalizer }
            : {}),
          db: input.db,
          effect: preview,
          logger: input.logger,
          ...(input.mediaFetcher ? { mediaFetcher: input.mediaFetcher } : {}),
          ...(input.mediaStorage ? { mediaStorage: input.mediaStorage } : {}),
        });
        const effect = await loadAuthorizedExternalBotEffect(
          input.db,
          effectId,
        );
        if (!effect) return missingEffectResult(input.db, effectId);
        if (effect.command.action === "handoff.request") {
          await synchronizeExternalBotEffectOutcome(input.db, { effect });
          await auditEffect(context, effect, "succeeded");
          return { externalEffectId: effect.effectId, kind: "succeeded" };
        }
        let providerOperation = effect.providerOperation;
        if (!providerOperation) {
          const capability =
            effect.command.action === "message.send_text"
              ? "text"
              : effect.command.action === "message.send_media"
                ? "media"
                : "templates";
          const connection = await resolveCrmProviderOperation({
            channel: effectChannel(effect),
            connectionId: effect.providerConnectionId,
            ports: input.providerOperationPorts,
            requiredCapabilities: ["outbound", capability],
            scope: { storeId: effect.storeId, tenantId: effect.tenantId },
          });
          providerOperation = toProviderOperation(
            await sendProviderCommand(input.gateway, connection, effect),
          );
        }
        await synchronizeExternalBotEffectOutcome(input.db, {
          effect,
          providerOperation,
        });
        await auditEffect(context, effect, "succeeded", {
          providerOperationId: providerOperation.id,
        });
        return {
          externalEffectId: providerOperation.id,
          kind: "succeeded",
        };
      } catch (error) {
        await auditEffect(context, preview, "failed", {
          errorCode: failureCode(error),
        });
        return providerFailure(error);
      }
    },
  };
}

async function missingEffectResult(db: Db, effectId: string) {
  if (await wasExternalBotProviderAttempted(db, effectId)) {
    return providerAttemptIndeterminate();
  }
  return permanentFailure("execution_authorization_failed");
}

function providerAttemptIndeterminate() {
  return {
    code: "provider_attempt_indeterminate",
    kind: "indeterminate",
  } as const;
}

function effectChannel(effect: AuthorizedExternalBotEffect) {
  const channel = effect.connection.canonical?.channel;
  if (!channel) {
    throw Object.assign(
      new Error("External bot CRM channel connection is unavailable."),
      { code: "configuration_error" },
    );
  }
  return channel;
}

function effectContext(
  input: { audit?: AuditSink; logger: ServiceLogger },
  effect: AuthorizedExternalBotEffect,
) {
  return createServiceContext({
    actor: {
      externalId: effect.integrationId,
      id: effect.integrationId,
      kind: "integration",
    },
    ...(input.audit ? { audit: input.audit } : {}),
    logger: input.logger,
    permissions: ["crm.messages.send", "crm.attendances.manage"],
    request: {
      idempotencyKey: effect.idempotencyKey,
      requestId: `crm_bot_effect_${effect.effectId}`,
    },
    source: { component: "external-bot-effect-worker", service: "api" },
    storeId: effect.storeId,
    tenantId: effect.tenantId,
  });
}

async function auditEffect(
  context: ServiceContext,
  effect: AuthorizedExternalBotEffect,
  outcome: "attempted" | "failed" | "succeeded",
  metadata: Record<string, string> = {},
) {
  await context.audit.record({
    action: `crm.external_bot.effect.${effect.command.action}`,
    actor: context.actor,
    category: "data_change",
    entityId: effect.effectId,
    entityType: "provider_effect",
    metadata: {
      canonicalCycleId: effect.canonicalCycleId,
      provider: effect.provider,
      providerConnectionId: effect.providerConnectionId,
      threadId: effect.threadId,
      ...metadata,
    },
    outcome,
    provider: {
      name: effect.provider,
      ...(metadata.providerOperationId
        ? { requestId: metadata.providerOperationId }
        : {}),
    },
    requestId: context.requestId,
    storeId: context.storeId,
    summary: `External bot ${effect.command.action} provider effect ${outcome}`,
    tenantId: context.tenantId,
  });
}
