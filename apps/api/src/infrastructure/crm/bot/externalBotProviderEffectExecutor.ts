import type { AuditSink } from "@lojaveiculosv2/audit";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@lojaveiculosv2/db";
import { createServiceContext } from "../../../shared/serviceContext.js";
import type { ServiceLogger } from "../../../shared/serviceLogger.js";
import type { CrmServices } from "../../../features/crm/controllers/crmServices.js";
import type { ExternalBotProviderEffectExecutor } from "./runExternalBotEffectWorker.js";
import {
  ExternalBotCanonicalSyncIndeterminateError,
  loadAuthorizedExternalBotEffect,
  synchronizeExternalBotEffectOutcome,
} from "../../db/crm/drizzleExternalBotEffectRuntime.js";

type Db = PostgresJsDatabase<typeof schema>;

export function createExternalBotProviderEffectExecutor(input: {
  audit?: AuditSink;
  db: Db;
  logger: ServiceLogger;
  services: CrmServices;
}): ExternalBotProviderEffectExecutor {
  return {
    execute: async ({ effectId }) => {
      const effect = await loadAuthorizedExternalBotEffect(input.db, effectId);
      if (!effect) return permanentFailure("authorization_revoked");
      const context = createServiceContext({
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
      try {
        if (effect.command.action === "message.send") {
          const message = await input.services.sendWhatsappText(context, {
            idempotencyKey: effect.idempotencyKey,
            senderOrigin: "bot_api",
            senderType: "AI",
            sessionId: effect.legacySessionId,
            text: effect.command.payload.text,
          });
          await synchronizeExternalBotEffectOutcome(input.db, {
            effect,
            legacyMessageId: message.id,
          });
          return {
            externalEffectId: message.externalId ?? message.id,
            kind: "succeeded",
          };
        }
        await input.services.toggleWhatsappIntervention(context, {
          commandId: effect.effectId,
          enabled: true,
          interventionId: effect.effectId,
          reason: effect.command.payload.reason,
          sessionId: effect.legacySessionId,
          source: "ai_request",
        });
        await synchronizeExternalBotEffectOutcome(input.db, { effect });
        return { externalEffectId: effect.effectId, kind: "succeeded" };
      } catch (error) {
        return providerFailure(error);
      }
    },
  };
}

function providerFailure(
  error: unknown,
): Awaited<ReturnType<ExternalBotProviderEffectExecutor["execute"]>> {
  const record = error as { code?: unknown; status?: unknown };
  const code = typeof record.code === "string" ? record.code : "effect_failed";
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
