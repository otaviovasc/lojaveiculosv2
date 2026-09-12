import { randomUUID } from "node:crypto";
import type {
  CrmProviderWebhookEvent,
  CrmWebhookEffect,
  CrmWebhookEventRepository,
} from "../../../../domains/crm/ports/crmWebhookEventRepository.js";
import {
  claimMemoryWebhookEffect,
  isMemoryWebhookEffectClaimable,
  isNextMemoryWebhookEffect,
} from "./crmWebhookEffectMemory.js";
import {
  matchesMemoryWebhookEventList,
  matchesMemoryWebhookEventScope,
} from "./crmWebhookEventMemory.js";

export function createMemoryCrmWebhookEventRepository(
  initialEvents: readonly CrmProviderWebhookEvent[] = [],
): CrmWebhookEventRepository {
  const events = [...initialEvents];
  const effects: CrmWebhookEffect[] = [];

  return {
    async claimDueEvents(input) {
      const candidates = events
        .filter(
          (event) =>
            event.eventType === input.eventType &&
            event.provider === input.provider &&
            event.processingAttempts < input.maxAttempts &&
            (event.status === "received" ||
              event.status === "failed" ||
              (event.status === "processing" &&
                (!event.processingStartedAt ||
                  event.processingStartedAt <= input.staleBefore))),
        )
        .sort(
          (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
        )
        .slice(0, input.limit);
      for (const event of candidates) {
        event.errorMessage = null;
        event.processedAt = null;
        event.processingAttempts += 1;
        event.processingStartedAt = input.now;
        event.processingToken = input.processingToken;
        event.status = "processing";
        event.updatedAt = input.now;
      }
      return candidates;
    },
    async claimDueEffects(input) {
      const claimed: CrmWebhookEffect[] = [];
      const candidates = effects
        .filter((effect) => isNextMemoryWebhookEffect(effects, effect))
        .filter((effect) => isMemoryWebhookEffectClaimable(effect, input))
        .sort(
          (left, right) =>
            left.nextAttemptAt.getTime() - right.nextAttemptAt.getTime() ||
            left.sequence - right.sequence,
        )
        .slice(0, input.limit);
      for (const effect of candidates) {
        claimMemoryWebhookEffect(effect, input.now, input.processingToken);
        claimed.push(effect);
      }
      return claimed;
    },
    async claimEffect(input) {
      const effect = effects.find((item) => item.id === input.effectId);
      if (!effect) return null;
      if (!isNextMemoryWebhookEffect(effects, effect)) return null;
      if (!isMemoryWebhookEffectClaimable(effect, input)) return null;
      claimMemoryWebhookEffect(
        effect,
        input.processingStartedAt,
        input.processingToken,
      );
      return effect;
    },
    async claimForProcessing(input) {
      const event = events.find((item) => item.id === input.eventId);
      if (!event) return null;
      const claimable =
        event.status === "failed" ||
        event.status === "received" ||
        (input.allowIgnored === true && event.status === "ignored") ||
        (event.status === "processing" &&
          (!event.processingStartedAt ||
            event.processingStartedAt <= input.staleBefore));
      if (!claimable) return null;
      event.errorMessage = null;
      event.processedAt = null;
      event.processingAttempts += 1;
      event.processingStartedAt = input.processingStartedAt;
      event.processingToken = input.processingToken;
      event.status = "processing";
      event.updatedAt = input.processingStartedAt;
      return event;
    },
    async findById(input) {
      return (
        events.find((event) => matchesMemoryWebhookEventScope(event, input)) ??
        null
      );
    },
    async completeEffect(input) {
      const effect = effects.find(
        (item) =>
          item.id === input.effectId &&
          item.status === "processing" &&
          item.processingToken === input.processingToken,
      );
      if (!effect) return null;
      effect.deliveredAt = input.deliveredAt;
      effect.deadLetteredAt = null;
      effect.processingStartedAt = null;
      effect.processingToken = null;
      effect.status = "delivered";
      return effect;
    },
    async failEffect(input) {
      const effect = effects.find(
        (item) =>
          item.id === input.effectId &&
          item.status === "processing" &&
          item.processingToken === input.processingToken,
      );
      if (!effect) return null;
      effect.lastErrorCode = input.lastErrorCode;
      effect.deadLetteredAt = input.deadLetteredAt;
      effect.nextAttemptAt = input.nextAttemptAt;
      effect.processingStartedAt = null;
      effect.processingToken = null;
      effect.status = input.status;
      return effect;
    },
    async listEffects(providerEventId) {
      return effects
        .filter((effect) => effect.providerEventId === providerEventId)
        .sort((left, right) => left.sequence - right.sequence);
    },
    async list(input) {
      return events
        .filter((event) => matchesMemoryWebhookEventList(event, input))
        .sort(
          (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
        )
        .slice(input.offset ?? 0, (input.offset ?? 0) + (input.limit ?? 50));
    },
    async recordReceived(input) {
      const existing = events.find(
        (event) =>
          event.provider === input.provider &&
          event.environment === input.environment &&
          event.connectionId === (input.connectionId ?? null) &&
          event.providerEventId === input.providerEventId,
      );
      if (existing) {
        return {
          created: false,
          divergentReplay:
            input.payloadDigest !== undefined &&
            input.payloadDigest !== existing.payloadDigest,
          event: existing,
        };
      }

      const now = new Date();
      const event: CrmProviderWebhookEvent = {
        connectionId: input.connectionId ?? null,
        createdAt: now,
        environment: input.environment,
        errorMessage: null,
        eventType: input.eventType,
        id: randomUUID(),
        payload: input.payload,
        payloadDigest: input.payloadDigest ?? null,
        processingAttempts: 0,
        processingStartedAt: null,
        processingToken: null,
        processedAt: null,
        provider: input.provider,
        providerEventId: input.providerEventId,
        status: "received",
        storeId: input.storeId ?? null,
        tenantId: input.tenantId ?? null,
        updatedAt: now,
      };
      events.push(event);
      return { created: true, divergentReplay: false, event };
    },
    async stageEffects(input) {
      const now = new Date();
      for (const staged of input.effects) {
        if (
          effects.some(
            (effect) =>
              effect.providerEventId === input.providerEventId &&
              effect.effectType === staged.effectType,
          )
        ) {
          continue;
        }
        effects.push({
          connectionId: input.connectionId,
          deadLetteredAt: null,
          deliveredAt: null,
          effectType: staged.effectType,
          id: randomUUID(),
          lastErrorCode: null,
          messageId: input.messageId,
          nextAttemptAt: now,
          processingAttempts: 0,
          processingStartedAt: null,
          processingToken: null,
          providerEventId: input.providerEventId,
          sequence: staged.sequence,
          cycleId: input.cycleId,
          status: "pending",
          storeId: input.storeId,
          tenantId: input.tenantId,
        });
      }
      return effects
        .filter((effect) => effect.providerEventId === input.providerEventId)
        .sort((left, right) => left.sequence - right.sequence);
    },
    async updateStatus(input) {
      const event = events.find((item) => item.id === input.eventId);
      if (!event) return null;
      if (
        input.processingToken &&
        (event.status !== "processing" ||
          event.processingToken !== input.processingToken)
      ) {
        return null;
      }
      event.errorMessage = input.errorMessage ?? null;
      if (input.payload) event.payload = input.payload;
      event.processedAt = new Date();
      event.processingStartedAt = null;
      event.processingToken = null;
      event.status = input.status;
      event.updatedAt = new Date();
      return event;
    },
  };
}
