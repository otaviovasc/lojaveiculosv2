import { randomUUID } from "node:crypto";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { CrmWebhookEffectType } from "../ports/crmWebhookEventRepository.js";
import type {
  CrmWebhookEffect,
  CrmWebhookEventRepository,
} from "../ports/crmWebhookEventRepository.js";
import type {
  CrmMessage,
  CrmConversationCycle,
} from "../ports/crmConversationRepository.js";
import {
  getCrmRealtimePublisher,
  getCrmWebhookEventRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { auditCrmServiceEvent } from "../services/CrmMessagingService/serviceSupport.js";
import { enqueueCrmMessageExternalBotEvent } from "../bot/externalBotEventForwarding.js";

export const olxWebhookEffectPolicy = {
  baseRetryDelayMs: 30_000,
  leaseMs: 5 * 60 * 1_000,
  maxAttempts: 8,
  maxRetryDelayMs: 60 * 60 * 1_000,
} as const;
const effects = [
  { effectType: "audit_accepted", sequence: 10 },
  { effectType: "realtime_message", sequence: 20 },
  { effectType: "realtime_session", sequence: 30 },
  { effectType: "bot_message", sequence: 40 },
] as const satisfies readonly {
  effectType: CrmWebhookEffectType;
  sequence: number;
}[];

export async function stageOlxWebhookEffects(
  ports: CrmServicePorts,
  input: {
    connection: CrmConnection;
    message: CrmMessage;
    providerEventId: string;
    conversationCycle: CrmConversationCycle;
  },
) {
  await getCrmWebhookEventRepository(ports).stageEffects({
    connectionId: input.connection.id,
    effects,
    messageId: input.message.id,
    providerEventId: input.providerEventId,
    cycleId: input.conversationCycle.id,
    storeId: input.connection.storeId,
    tenantId: input.connection.tenantId,
  });
}

export async function deliverOlxWebhookEffects(
  context: ServiceContext,
  input: {
    connection: CrmConnection;
    message: CrmMessage;
    providerEventId: string;
    providerEventReference: string;
    conversationCycle: CrmConversationCycle;
  },
  ports: CrmServicePorts,
) {
  const repository = getCrmWebhookEventRepository(ports);
  const pending = await repository.listEffects(input.providerEventId);
  for (const effect of pending) {
    if (effect.status === "delivered") continue;
    if (effect.status === "dead_letter") break;
    const processingStartedAt = new Date();
    const processingToken = randomUUID();
    const claimed = await repository.claimEffect({
      effectId: effect.id,
      maxAttempts: olxWebhookEffectPolicy.maxAttempts,
      now: processingStartedAt,
      processingStartedAt,
      processingToken,
      staleBefore: new Date(
        processingStartedAt.getTime() - olxWebhookEffectPolicy.leaseMs,
      ),
    });
    if (!claimed) break;
    try {
      await deliverClaimedOlxWebhookEffect(context, claimed, input, ports);
      await completeClaimedEffect(repository, claimed, new Date());
    } catch (error) {
      await failClaimedOlxWebhookEffect(repository, claimed, error, new Date());
      break;
    }
  }
  await assertOlxWebhookEffectsDelivered(repository, input.providerEventId);
}

export async function assertOlxWebhookEffectsDelivered(
  repository: CrmWebhookEventRepository,
  providerEventId: string,
) {
  const incomplete = (await repository.listEffects(providerEventId)).filter(
    (effect) => effect.status !== "delivered",
  );
  if (incomplete.length > 0)
    throw new OlxWebhookEffectDeliveryError(incomplete.length);
}

export async function deliverClaimedOlxWebhookEffect(
  context: ServiceContext,
  effect: Pick<CrmWebhookEffect, "effectType" | "id">,
  input: {
    connection: CrmConnection;
    message: CrmMessage;
    providerEventReference: string;
    conversationCycle: CrmConversationCycle;
  },
  ports: CrmServicePorts,
) {
  switch (effect.effectType) {
    case "audit_accepted":
      await auditCrmServiceEvent(context, {
        action: "crm.messaging.webhook.olx.accepted",
        auditId: effect.id,
        category: "data_change",
        entityId: input.connection.id,
        entityType: "crm_messaging_connection",
        metadata: {
          phase: "accepted",
          provider: "olx",
          providerEventId: input.providerEventReference,
        },
        permission: "crm.messages.ingest",
        failureTier: "required",
        storeId: input.connection.storeId,
        summary: "Accepted OLX Chat webhook",
        tenantId: input.connection.tenantId,
      });
      return;
    case "bot_message":
      await enqueueCrmMessageExternalBotEvent(
        context,
        {
          connection: input.connection,
          message: input.message,
          conversationCycle: input.conversationCycle,
        },
        ports,
        { throwOnFailure: true },
      );
      return;
    case "realtime_message":
      await getCrmRealtimePublisher(ports).publish({
        connectionId: input.connection.id,
        message: input.message,
        conversationCycle: input.conversationCycle,
        storeId: input.connection.storeId,
        tenantId: input.connection.tenantId,
        type: "message",
      });
      return;
    case "realtime_session":
      await getCrmRealtimePublisher(ports).publish({
        connectionId: input.connection.id,
        conversationCycle: input.conversationCycle,
        storeId: input.connection.storeId,
        tenantId: input.connection.tenantId,
        type: "conversationCycle",
      });
  }
}

export async function completeClaimedEffect(
  repository: CrmWebhookEventRepository,
  effect: Pick<CrmWebhookEffect, "id" | "processingToken">,
  deliveredAt: Date,
) {
  if (!effect.processingToken)
    throw new Error("OLX webhook effect has no processing token.");
  const completed = await repository.completeEffect({
    deliveredAt,
    effectId: effect.id,
    processingToken: effect.processingToken,
  });
  if (!completed) throw new Error("OLX webhook effect completion conflicted.");
}

export async function failClaimedOlxWebhookEffect(
  repository: CrmWebhookEventRepository,
  effect: Pick<
    CrmWebhookEffect,
    "id" | "processingAttempts" | "processingToken"
  >,
  error: unknown,
  failedAt: Date,
) {
  if (!effect.processingToken)
    throw new Error("OLX webhook effect has no processing token.");
  const deadLetter =
    effect.processingAttempts >= olxWebhookEffectPolicy.maxAttempts;
  const retryDelay = Math.min(
    olxWebhookEffectPolicy.maxRetryDelayMs,
    olxWebhookEffectPolicy.baseRetryDelayMs *
      2 ** Math.max(0, effect.processingAttempts - 1),
  );
  const failed = await repository.failEffect({
    deadLetteredAt: deadLetter ? failedAt : null,
    effectId: effect.id,
    lastErrorCode: error instanceof Error ? error.name : "UnknownError",
    nextAttemptAt: new Date(failedAt.getTime() + retryDelay),
    processingToken: effect.processingToken,
    status: deadLetter ? "dead_letter" : "failed",
  });
  if (!failed) throw new Error("OLX webhook effect failure conflicted.");
  return failed;
}

export class OlxWebhookEffectDeliveryError extends Error {
  constructor(failedEffectCount: number) {
    super(
      `OLX webhook has ${failedEffectCount} undelivered durable effect(s).`,
    );
    this.name = "OlxWebhookEffectDeliveryError";
  }
}
