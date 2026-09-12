import type { CrmWebhookEffect } from "../../../../domains/crm/ports/crmWebhookEventRepository.js";

export function isMemoryWebhookEffectClaimable(
  effect: CrmWebhookEffect,
  input: { maxAttempts: number; now: Date; staleBefore: Date },
) {
  if (effect.processingAttempts >= input.maxAttempts) return false;
  if (effect.status === "pending" || effect.status === "failed") {
    return effect.nextAttemptAt <= input.now;
  }
  return (
    effect.status === "processing" &&
    (!effect.processingStartedAt ||
      effect.processingStartedAt <= input.staleBefore)
  );
}

export function isNextMemoryWebhookEffect(
  effects: readonly CrmWebhookEffect[],
  candidate: CrmWebhookEffect,
) {
  return !effects.some(
    (effect) =>
      effect.providerEventId === candidate.providerEventId &&
      effect.sequence < candidate.sequence &&
      effect.status !== "delivered",
  );
}

export function claimMemoryWebhookEffect(
  effect: CrmWebhookEffect,
  processingStartedAt: Date,
  processingToken: string,
) {
  effect.lastErrorCode = null;
  effect.processingAttempts += 1;
  effect.processingStartedAt = processingStartedAt;
  effect.processingToken = processingToken;
  effect.status = "processing";
}
