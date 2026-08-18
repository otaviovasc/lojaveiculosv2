import type { AuditSink } from "@lojaveiculosv2/audit";
import type * as schema from "@lojaveiculosv2/db";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { CrmMessagingGateway } from "../../../domains/crm/ports/crmMessagingGateway.js";
import {
  resolveCrmProviderOperation,
  type CrmProviderOperationPorts,
} from "../../../domains/crm/services/CrmRoutingService/resolveCrmProviderOperation.js";
import {
  createServiceContext,
  type ServiceContext,
} from "../../../shared/serviceContext.js";
import type { ServiceLogger } from "../../../shared/serviceLogger.js";
import type { ExternalBotProviderEffectExecutor } from "./runExternalBotEffectWorker.js";
import {
  ExternalBotCanonicalSyncIndeterminateError,
  loadAuthorizedExternalBotEffect,
  synchronizeExternalBotEffectOutcome,
  wasExternalBotProviderAttempted,
  type AuthorizedExternalBotEffect,
} from "../../db/crm/drizzleExternalBotEffectRuntime.js";

type Db = PostgresJsDatabase<typeof schema>;

export function createExternalBotProviderEffectExecutor(input: {
  audit?: AuditSink;
  db: Db;
  gateway: Pick<CrmMessagingGateway, "sendMedia" | "sendTemplate" | "sendText">;
  logger: ServiceLogger;
  providerOperationPorts: CrmProviderOperationPorts;
}): ExternalBotProviderEffectExecutor {
  return {
    execute: async ({ effectId }) => {
      const effect = await loadAuthorizedExternalBotEffect(input.db, effectId);
      if (!effect) {
        if (await wasExternalBotProviderAttempted(input.db, effectId)) {
          return {
            code: "provider_attempt_indeterminate",
            kind: "indeterminate",
          };
        }
        return permanentFailure("execution_authorization_failed");
      }
      const context = effectContext(input, effect);
      try {
        await auditEffect(context, effect, "attempted");
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
        await auditEffect(context, effect, "failed", {
          errorCode: failureCode(error),
        });
        return providerFailure(error);
      }
    },
  };
}

function sendProviderCommand(
  gateway: Pick<CrmMessagingGateway, "sendMedia" | "sendTemplate" | "sendText">,
  connection: Parameters<CrmMessagingGateway["sendText"]>[0],
  effect: AuthorizedExternalBotEffect,
) {
  if (effect.command.action === "handoff.request") {
    throw Object.assign(new Error("Handoff has no provider operation."), {
      code: "configuration_error",
    });
  }
  if (effect.command.action === "message.send_text") {
    return gateway.sendText(connection, {
      phone: effect.providerAddress,
      text: effect.command.payload.text,
    });
  }
  if (effect.command.action === "message.send_media") {
    return gateway.sendMedia(connection, {
      ...(effect.command.payload.caption
        ? { caption: effect.command.payload.caption }
        : {}),
      mediaType: effect.command.payload.mediaType as
        "audio" | "document" | "image" | "video",
      mediaUrl: effect.command.payload.mediaUrl,
      phone: effect.providerAddress,
    });
  }
  return gateway.sendTemplate(connection, {
    components: [
      {
        parameters: Object.entries(effect.command.payload.variables)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([, value]) => ({ text: value, type: "text" as const })),
        type: "body",
      },
    ],
    languageCode: "pt_BR",
    name: effect.command.payload.templateName,
    phone: effect.providerAddress,
  });
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

function toProviderOperation(input: {
  externalId: string;
  providerTimestamp: Date;
}) {
  return { id: input.externalId, occurredAt: input.providerTimestamp };
}

function failureCode(error: unknown) {
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : "effect_failed";
}

function providerFailure(
  error: unknown,
): Awaited<ReturnType<ExternalBotProviderEffectExecutor["execute"]>> {
  const record = error as { code?: unknown; status?: unknown };
  const code = failureCode(error);
  if (
    error instanceof ExternalBotCanonicalSyncIndeterminateError ||
    (error instanceof Error &&
      error.message ===
        "CRM WhatsApp delivery outcome is pending reconciliation.")
  ) {
    return { code: "delivery_indeterminate", kind: "indeterminate" };
  }
  if (code === "timeout" || code === "request_failed") {
    return { code, kind: "indeterminate" };
  }
  if (
    code === "configuration_error" ||
    code === "provider_rejected" ||
    code === "validation_failed"
  ) {
    return permanentFailure(code);
  }
  if (
    code === "rate_limited" ||
    code === "provider_unavailable" ||
    record.status === 429 ||
    (typeof record.status === "number" && record.status >= 500)
  ) {
    return { code, kind: "failed", retryable: true };
  }
  return permanentFailure(code);
}

function permanentFailure(code: string) {
  return { code, kind: "failed", retryable: false } as const;
}
