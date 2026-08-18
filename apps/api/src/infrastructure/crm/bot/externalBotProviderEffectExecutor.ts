import type { AuditSink } from "@lojaveiculosv2/audit";
import type * as schema from "@lojaveiculosv2/db";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { CrmWhatsappGateway } from "../../../domains/crm/ports/crmWhatsappGateway.js";
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
  type AuthorizedExternalBotEffect,
} from "../../db/crm/drizzleExternalBotEffectRuntime.js";

type Db = PostgresJsDatabase<typeof schema>;

export function createExternalBotProviderEffectExecutor(input: {
  audit?: AuditSink;
  db: Db;
  gateway: Pick<CrmWhatsappGateway, "sendText">;
  logger: ServiceLogger;
}): ExternalBotProviderEffectExecutor {
  return {
    execute: async ({ effectId }) => {
      const effect = await loadAuthorizedExternalBotEffect(input.db, effectId);
      if (!effect) return permanentFailure("authorization_revoked");
      const context = effectContext(input, effect);
      try {
        await auditEffect(context, effect, "attempted");
        if (effect.command.action === "message.send") {
          const providerOperation =
            effect.providerOperation ??
            toProviderOperation(
              await input.gateway.sendText(effect.connection, {
                phone: effect.providerAddress,
                text: effect.command.payload.text,
              }),
            );
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
        }
        await synchronizeExternalBotEffectOutcome(input.db, { effect });
        await auditEffect(context, effect, "succeeded");
        return { externalEffectId: effect.effectId, kind: "succeeded" };
      } catch (error) {
        await auditEffect(context, effect, "failed", {
          errorCode: failureCode(error),
        });
        return providerFailure(error);
      }
    },
  };
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
    permissions: ["crm.whatsapp.send", "crm.whatsapp.toggle_intervention"],
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
