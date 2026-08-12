import { createHash } from "node:crypto";

export function getOlxWebhookFreshnessRejectionReason(
  timestamp: Date,
  policy: { futureSkewMs: number; maxAgeMs: number; now(): Date },
) {
  const ageMs = policy.now().getTime() - timestamp.getTime();
  return ageMs > policy.maxAgeMs
    ? "stale_event"
    : ageMs < -policy.futureSkewMs
      ? "future_event"
      : null;
}

export function buildOlxProviderEventReference(externalMessageId: string) {
  return `olx:${createHash("sha256").update(externalMessageId).digest("hex")}`;
}
