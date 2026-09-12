import { randomUUID } from "node:crypto";
import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import {
  completeClaimedEffect,
  deliverClaimedOlxWebhookEffect,
  failClaimedOlxWebhookEffect,
  olxWebhookEffectPolicy,
} from "../../messaging/olxWebhookEffectOutbox.js";
import { logOlxRecoveredEffect } from "../../messaging/olxWebhookRecoveryObservability.js";
import type { CrmWebhookEffect } from "../../ports/crmWebhookEventRepository.js";
import {
  getCrmConnectionRepository,
  getCrmWebhookEventRepository,
  getCrmConversationRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";

const permission = "crm.messages.ingest" as const;

export type RecoverOlxWebhookEffectsInput = {
  limit: number;
  now?: Date;
};

export type RecoverOlxWebhookEffectsResult = {
  claimed: number;
  completedEvents: number;
  deadLettered: number;
  delivered: number;
  failed: number;
};

export async function recoverOlxWebhookEffects(
  context: ServiceContext,
  input: RecoverOlxWebhookEffectsInput,
  ports: CrmServicePorts,
): Promise<RecoverOlxWebhookEffectsResult> {
  assertPermission(context, permission);
  const now = input.now ?? new Date();
  context.logger.info(
    "crm.messaging.webhook.olx.recovery.started",
    createServiceLogMetadata(context, {
      limit: input.limit,
      maxAttempts: olxWebhookEffectPolicy.maxAttempts,
    }),
  );
  try {
    const repository = getCrmWebhookEventRepository(ports);
    const claimed = await repository.claimDueEffects({
      limit: input.limit,
      maxAttempts: olxWebhookEffectPolicy.maxAttempts,
      now,
      processingToken: randomUUID(),
      staleBefore: new Date(now.getTime() - olxWebhookEffectPolicy.leaseMs),
    });
    const result: RecoverOlxWebhookEffectsResult = {
      claimed: claimed.length,
      completedEvents: 0,
      deadLettered: 0,
      delivered: 0,
      failed: 0,
    };
    for (const effect of claimed) {
      await recoverEffect(context, effect, ports, now, result);
    }
    context.logger.info(
      "crm.messaging.webhook.olx.recovery.completed",
      createServiceLogMetadata(context, result),
    );
    return result;
  } catch (error) {
    context.logger.error(
      "crm.messaging.webhook.olx.recovery.failed",
      createServiceLogMetadata(context, {
        errorName: error instanceof Error ? error.name : "UnknownError",
        limit: input.limit,
      }),
    );
    throw error;
  }
}

async function recoverEffect(
  context: ServiceContext,
  effect: CrmWebhookEffect,
  ports: CrmServicePorts,
  now: Date,
  result: RecoverOlxWebhookEffectsResult,
) {
  const repository = getCrmWebhookEventRepository(ports);
  try {
    const delivery = await hydrateDelivery(effect, ports);
    await deliverClaimedOlxWebhookEffect(context, effect, delivery, ports);
    await completeClaimedEffect(repository, effect, now);
    result.delivered += 1;
    const remaining = (
      await repository.listEffects(effect.providerEventId)
    ).some((candidate) => candidate.status !== "delivered");
    if (!remaining) {
      await repository.updateStatus({
        eventId: effect.providerEventId,
        status: "processed",
      });
      result.completedEvents += 1;
    }
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const failed = await failClaimedOlxWebhookEffect(
      repository,
      effect,
      error,
      now,
    );
    await repository.updateStatus({
      errorMessage: failed.lastErrorCode,
      eventId: effect.providerEventId,
      status: "failed",
    });
    if (failed.status === "dead_letter") result.deadLettered += 1;
    else result.failed += 1;
    logOlxRecoveredEffect(context, "failed", effect, failed.status, errorName);
    await auditOlxRecoveredEffect(
      context,
      effect,
      "failed",
      failed.status,
      errorName,
    );
    return;
  }
  logOlxRecoveredEffect(context, "succeeded", effect, "delivered");
  await auditOlxRecoveredEffect(context, effect, "succeeded", "delivered");
}

async function auditOlxRecoveredEffect(
  context: ServiceContext,
  effect: CrmWebhookEffect,
  outcome: "failed" | "succeeded",
  status: CrmWebhookEffect["status"],
  errorName?: string,
) {
  await context.audit.record({
    action: "crm.messaging.webhook.olx.recovery.effect",
    actor: context.actor,
    category: "data_change",
    entityId: effect.id,
    entityType: "crm_webhook_effect",
    failureTier: "best_effort",
    metadata: {
      connectionId: effect.connectionId,
      effectType: effect.effectType,
      ...(errorName ? { errorName } : {}),
      permission,
      processingAttempts: effect.processingAttempts,
      provider: "olx",
      providerEventId: effect.providerEventId,
      status,
    },
    outcome,
    requestId: context.requestId,
    storeId: effect.storeId,
    summary: "Recovered durable OLX webhook effect",
    tenantId: effect.tenantId,
  });
}

async function hydrateDelivery(
  effect: CrmWebhookEffect,
  ports: CrmServicePorts,
) {
  const scope = { storeId: effect.storeId, tenantId: effect.tenantId };
  const [connection, event, message, conversationCycles] = await Promise.all([
    getCrmConnectionRepository(ports).findConnectionById(effect.connectionId),
    getCrmWebhookEventRepository(ports).findById({
      eventId: effect.providerEventId,
      ...scope,
    }),
    getCrmConversationRepository(ports).findMessageById({
      messageId: effect.messageId,
      ...scope,
    }),
    getCrmConversationRepository(ports).listConversationCycles({
      limit: 1,
      offset: 0,
      cycleId: effect.cycleId,
      ...scope,
    }),
  ]);
  const conversationCycle = conversationCycles[0];
  if (
    !connection ||
    connection.channel !== "olx_chat" ||
    connection.provider !== "olx" ||
    connection.id !== effect.connectionId ||
    connection.storeId !== effect.storeId ||
    connection.tenantId !== effect.tenantId ||
    !event ||
    event.connectionId !== effect.connectionId ||
    event.provider !== "olx" ||
    event.storeId !== effect.storeId ||
    event.tenantId !== effect.tenantId ||
    !message ||
    message.connectionId !== effect.connectionId ||
    message.cycleId !== effect.cycleId ||
    !conversationCycle ||
    conversationCycle.connectionId !== effect.connectionId
  ) {
    throw new OlxWebhookEffectScopeError();
  }
  return {
    connection,
    message,
    providerEventReference: event.providerEventId,
    conversationCycle,
  };
}

class OlxWebhookEffectScopeError extends Error {
  constructor() {
    super("OLX webhook effect scope could not be hydrated.");
    this.name = "OlxWebhookEffectScopeError";
  }
}
