import { randomUUID } from "node:crypto";
import type {
  CrmPushIntent,
  CrmPushLeaseIdentity,
  CrmPushScope,
} from "./ports/crmPushRepository.js";

export type MemoryCrmPushIntent = CrmPushIntent & {
  lastErrorCode: string | null;
  leaseExpiresAt: Date | null;
  leaseToken: string | null;
  nextAttemptAt: Date;
  providerNotificationId: string | null;
};

export function mutateMemoryCrmPushLease<T extends CrmPushLeaseIdentity>(
  intents: Map<string, MemoryCrmPushIntent>,
  input: T,
  mutate: (intent: MemoryCrmPushIntent) => void,
) {
  const result = findMemoryCrmPushLeasedIntent(intents, input);
  if (result.kind !== "found") return result.result;
  mutate(result.intent);
  return "applied" as const;
}

export function findMemoryCrmPushLeasedIntent(
  intents: Map<string, MemoryCrmPushIntent>,
  input: CrmPushLeaseIdentity,
) {
  const intent = intents.get(input.intentId);
  if (!intent)
    return { kind: "missing" as const, result: "not_found" as const };
  if (intent.state !== "processing" || intent.leaseToken !== input.leaseToken) {
    return { kind: "stale" as const, result: "stale_lease" as const };
  }
  return { intent, kind: "found" as const };
}

export function toCrmPushIntent(intent: MemoryCrmPushIntent): CrmPushIntent {
  const {
    lastErrorCode: _lastErrorCode,
    leaseExpiresAt: _leaseExpiresAt,
    leaseToken: _leaseToken,
    nextAttemptAt: _nextAttemptAt,
    providerNotificationId: _providerNotificationId,
    ...value
  } = intent;
  return value;
}

export function scopeKey(scope: CrmPushScope) {
  return `${scope.tenantId}:${scope.storeId}`;
}

export function preferenceKey(scope: CrmPushScope, userId: string) {
  return `${scopeKey(scope)}:${userId}`;
}

export function deliveryContextKey(input: {
  cycleId: string;
  messageId: string;
  storeId: string;
  tenantId: string;
  threadId: string;
}) {
  return `${scopeKey(input)}:${input.threadId}:${input.cycleId}:${input.messageId}`;
}

export function createMemoryCrmPushLeaseToken() {
  return randomUUID();
}
