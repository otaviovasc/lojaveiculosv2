import type { CrmRetentionCutoffs } from "../ports/crmRetentionRepository.js";

export const crmRetentionPolicy = Object.freeze({
  audit: "durable_bodyless",
  botInteractionDays: 30,
  canonicalMessageMonths: 18,
  providerRawPayloadDays: 7,
  retainedFacts: "while_necessary",
} as const);

function subtractUtcMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const originalDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() - months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDay));
  return result;
}

function subtractUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1_000);
}

export function calculateCrmRetentionCutoffs(now: Date): CrmRetentionCutoffs {
  return {
    botInteractionBefore: subtractUtcDays(
      now,
      crmRetentionPolicy.botInteractionDays,
    ),
    canonicalMessageBefore: subtractUtcMonths(
      now,
      crmRetentionPolicy.canonicalMessageMonths,
    ),
    providerRawPayloadBefore: subtractUtcDays(
      now,
      crmRetentionPolicy.providerRawPayloadDays,
    ),
  };
}
