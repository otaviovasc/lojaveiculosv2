import type { CrmScheduledMessage } from "../ports/crmConversationRepository.js";

/** The scheduler lease is deliberately independent from scheduledAt. */
export const CRM_SCHEDULED_MESSAGE_LEASE_MS = 2 * 60_000;
export const CRM_SCHEDULED_MESSAGE_INITIAL_RETRY_MS = 60_000;
export const CRM_SCHEDULED_MESSAGE_MAX_RETRY_MS = 60 * 60_000;
export const CRM_CAMPAIGN_BOOKKEEPING_INITIAL_RETRY_MS = 60_000;
export const CRM_CAMPAIGN_BOOKKEEPING_MAX_RETRY_MS = 60 * 60_000;

export const SCHEDULED_DELIVERY_STATE_KEY = "scheduledDeliveryState";
export const SCHEDULED_DELIVERY_ATTEMPTS_KEY = "scheduledDeliveryAttempts";
export const SCHEDULED_DELIVERY_NEXT_ATTEMPT_AT_KEY =
  "scheduledDeliveryNextAttemptAt";
/** Durable owner fence written on every scheduler claim. */
export const SCHEDULED_CLAIM_TOKEN_KEY = "scheduledClaimToken";
export const CAMPAIGN_BOOKKEEPING_ATTEMPTS_KEY = "campaignBookkeepingAttempts";
export const CAMPAIGN_BOOKKEEPING_NEXT_ATTEMPT_AT_KEY =
  "campaignBookkeepingNextAttemptAt";

export function readScheduledClaimToken(
  metadata: Record<string, unknown>,
): string | undefined {
  const token = metadata[SCHEDULED_CLAIM_TOKEN_KEY];
  return typeof token === "string" && token.length > 0 ? token : undefined;
}

/**
 * A sending row without a scheduler backoff is an abandoned lease candidate.
 * Once a provider outcome is indeterminate, the row is intentionally held
 * until the recorded retry time so it cannot monopolize the due batch.
 */
export function isScheduledMessageRetryDue(
  message: Pick<CrmScheduledMessage, "metadata">,
  now: Date,
) {
  const raw = message.metadata[SCHEDULED_DELIVERY_NEXT_ATTEMPT_AT_KEY];
  if (raw === undefined) return true;
  if (typeof raw !== "string") return false;
  const retryAt = new Date(raw);
  return !Number.isNaN(retryAt.getTime()) && retryAt <= now;
}

export function markScheduledMessageIndeterminate(
  message: Pick<CrmScheduledMessage, "metadata">,
  now: Date,
  errorMessage: string,
) {
  const previousAttempts = readAttemptCount(message.metadata);
  const attempts = previousAttempts + 1;
  const retryDelay = Math.min(
    CRM_SCHEDULED_MESSAGE_INITIAL_RETRY_MS * 2 ** (attempts - 1),
    CRM_SCHEDULED_MESSAGE_MAX_RETRY_MS,
  );
  return {
    ...message.metadata,
    [SCHEDULED_DELIVERY_STATE_KEY]: "indeterminate",
    [SCHEDULED_DELIVERY_ATTEMPTS_KEY]: attempts,
    [SCHEDULED_DELIVERY_NEXT_ATTEMPT_AT_KEY]: new Date(
      now.getTime() + retryDelay,
    ).toISOString(),
    scheduledDeliveryError: errorMessage,
  };
}

export function clearScheduledMessageDeliveryState(
  metadata: Record<string, unknown>,
) {
  const next = { ...metadata };
  delete next[SCHEDULED_DELIVERY_STATE_KEY];
  delete next[SCHEDULED_DELIVERY_NEXT_ATTEMPT_AT_KEY];
  delete next.scheduledDeliveryError;
  return next;
}

/**
 * Successful delivery clears the retry history as well as the transient
 * state. Claims deliberately use clearScheduledMessageDeliveryState so a
 * retry after an indeterminate provider outcome keeps its backoff count.
 */
export function clearScheduledMessageDeliveryAttempts(
  metadata: Record<string, unknown>,
) {
  const next = clearScheduledMessageDeliveryState(metadata);
  delete next[SCHEDULED_DELIVERY_ATTEMPTS_KEY];
  return next;
}

/** Clears an abandoned scheduler lease before special-date replacement. */
export function resetScheduledMessageForRetry(
  metadata: Record<string, unknown>,
) {
  const next = clearScheduledMessageDeliveryAttempts(metadata);
  delete next[SCHEDULED_CLAIM_TOKEN_KEY];
  return next;
}

export function isCampaignBookkeepingRetryDue(
  metadata: Record<string, unknown>,
  now: Date,
) {
  const raw = metadata[CAMPAIGN_BOOKKEEPING_NEXT_ATTEMPT_AT_KEY];
  if (raw === undefined) return true;
  if (typeof raw !== "string") return false;
  const retryAt = new Date(raw);
  return !Number.isNaN(retryAt.getTime()) && retryAt <= now;
}

export function markCampaignBookkeepingRetry(
  metadata: Record<string, unknown>,
  now: Date,
  errorMessage: string,
) {
  const previousAttempts = readAttemptCount(
    metadata,
    CAMPAIGN_BOOKKEEPING_ATTEMPTS_KEY,
  );
  const attempts = previousAttempts + 1;
  const retryDelay = Math.min(
    CRM_CAMPAIGN_BOOKKEEPING_INITIAL_RETRY_MS * 2 ** (attempts - 1),
    CRM_CAMPAIGN_BOOKKEEPING_MAX_RETRY_MS,
  );
  return {
    ...metadata,
    [CAMPAIGN_BOOKKEEPING_ATTEMPTS_KEY]: attempts,
    [CAMPAIGN_BOOKKEEPING_NEXT_ATTEMPT_AT_KEY]: new Date(
      now.getTime() + retryDelay,
    ).toISOString(),
    campaignBookkeepingError: errorMessage,
    campaignBookkeepingPending: true,
  };
}

export function clearCampaignBookkeepingState(
  metadata: Record<string, unknown>,
) {
  const next = { ...metadata };
  delete next[CAMPAIGN_BOOKKEEPING_ATTEMPTS_KEY];
  delete next[CAMPAIGN_BOOKKEEPING_NEXT_ATTEMPT_AT_KEY];
  delete next.campaignBookkeepingError;
  delete next.campaignBookkeepingPending;
  return next;
}

export function isDueScheduledMessage(
  message: Pick<
    CrmScheduledMessage,
    "metadata" | "scheduledAt" | "status" | "updatedAt"
  >,
  dueAt: Date,
  staleBefore: Date,
  now: Date,
) {
  if (message.status === "pending" && message.scheduledAt <= dueAt) {
    return true;
  }
  return (
    message.status === "sending" &&
    message.updatedAt <= staleBefore &&
    isScheduledMessageRetryDue(message, now)
  );
}

function readAttemptCount(
  metadata: Record<string, unknown>,
  key = SCHEDULED_DELIVERY_ATTEMPTS_KEY,
) {
  const value = metadata[key];
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
}
