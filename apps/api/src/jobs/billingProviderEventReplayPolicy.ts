export const providerEventBatchSize = 50;
export const providerEventMaxAttempts = 12;
export const providerEventProcessingLeaseMs = 5 * 60 * 1_000;
export const providerEventRetryBaseMs = 5_000;
export const providerEventRetryMaxMs = 5 * 60 * 1_000;
export const providerEventExhaustedError =
  "provider_reconciliation_attempts_exhausted";

export function billingProviderEventRetryDelayMs(processingAttempts: number) {
  const exponent = Math.max(0, Math.trunc(processingAttempts) - 1);
  return Math.min(
    providerEventRetryMaxMs,
    providerEventRetryBaseMs * 2 ** exponent,
  );
}

export function billingProviderEventCanReplay(
  input: {
    processingAttempts: number;
    processingStartedAt: Date | null;
    status: string;
    updatedAt: Date;
  },
  now: Date,
) {
  if (input.processingAttempts >= providerEventMaxAttempts) return false;
  if (input.status === "processing") {
    return (
      !input.processingStartedAt ||
      input.processingStartedAt.getTime() <=
        now.getTime() - providerEventProcessingLeaseMs
    );
  }
  if (input.status !== "failed" && input.status !== "pending_reconciliation") {
    return false;
  }
  return (
    input.updatedAt.getTime() +
      billingProviderEventRetryDelayMs(input.processingAttempts) <=
    now.getTime()
  );
}

export function billingProviderEventIsExhausted(input: {
  processingAttempts: number;
  status: string;
}) {
  return (
    input.processingAttempts >= providerEventMaxAttempts &&
    ["failed", "pending_reconciliation", "processing"].includes(input.status)
  );
}

export function orderReplayCandidates<
  T extends { id: string; createdAt: Date; updatedAt: Date },
>(events: readonly T[]): T[] {
  return [...events].sort(
    (left, right) =>
      left.updatedAt.getTime() - right.updatedAt.getTime() ||
      left.createdAt.getTime() - right.createdAt.getTime() ||
      left.id.localeCompare(right.id),
  );
}
