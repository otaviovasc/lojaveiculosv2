import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../shared/serviceContext.js";
import type { CrmWebhookEffect } from "../ports/crmWebhookEventRepository.js";

type RecoveryOutcome = "failed" | "succeeded";

export function logOlxRecoveredEffect(
  context: ServiceContext,
  outcome: RecoveryOutcome,
  effect: CrmWebhookEffect,
  status: CrmWebhookEffect["status"],
  errorName?: string,
) {
  const metadata = {
    ...createServiceLogMetadata(context, {
      connectionId: effect.connectionId,
      effectId: effect.id,
      effectType: effect.effectType,
      ...(errorName ? { errorName } : {}),
      processingAttempts: effect.processingAttempts,
      provider: "olx",
      providerEventId: effect.providerEventId,
      status,
    }),
    storeId: effect.storeId,
    tenantId: effect.tenantId,
  };
  if (outcome === "failed") {
    context.logger.warn(
      "crm.messaging.webhook.olx.recovery.effect.failed",
      metadata,
    );
    return;
  }
  context.logger.info(
    "crm.messaging.webhook.olx.recovery.effect.succeeded",
    metadata,
  );
}
