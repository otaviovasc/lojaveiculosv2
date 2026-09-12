import type {
  CrmPushDeliveryContext,
  CrmPushRecipientCandidate,
  CrmPushRepository,
  CrmPushScope,
  CrmPushSubscription,
} from "./ports/crmPushRepository.js";
import {
  createMemoryCrmPushLeaseToken,
  deliveryContextKey,
  findMemoryCrmPushLeasedIntent,
  mutateMemoryCrmPushLease,
  preferenceKey,
  scopeKey,
  toCrmPushIntent,
  type MemoryCrmPushIntent,
} from "./testSupportCrmPushHelpers.js";

export type MemoryCrmPushRepository = CrmPushRepository & {
  listIntents(): readonly MemoryCrmPushIntent[];
  seedDeliveryContext(context: CrmPushDeliveryContext): void;
  seedRecipientCandidates(
    scope: CrmPushScope,
    candidates: readonly CrmPushRecipientCandidate[],
  ): void;
  setCycleGeneration(cycleId: string, generation: number): void;
};

export function createMemoryCrmPushRepository(): MemoryCrmPushRepository {
  const subscriptions = new Map<string, CrmPushSubscription>();
  const preferences = new Map<string, boolean>();
  const recipients = new Map<string, readonly CrmPushRecipientCandidate[]>();
  const deliveryContexts = new Map<string, CrmPushDeliveryContext>();
  const cycleGenerations = new Map<string, number>();
  const intents = new Map<string, MemoryCrmPushIntent>();
  let nextIntentId = 1;

  const repository: MemoryCrmPushRepository = {
    async claimDeliveryBatch(input) {
      return [...intents.values()]
        .filter(
          (intent) =>
            (intent.state === "pending" &&
              intent.nextAttemptAt.getTime() <= input.now.getTime()) ||
            (intent.state === "processing" &&
              intent.leaseExpiresAt !== null &&
              intent.leaseExpiresAt.getTime() <= input.now.getTime()),
        )
        .sort((left, right) => left.id.localeCompare(right.id))
        .slice(0, input.limit)
        .map((intent) => {
          intent.attemptCount += 1;
          intent.state = "processing";
          intent.leaseToken = createMemoryCrmPushLeaseToken();
          intent.leaseExpiresAt = new Date(
            input.now.getTime() + input.leaseDurationMs,
          );
          return {
            ...toCrmPushIntent(intent),
            leaseExpiresAt: intent.leaseExpiresAt,
            leaseToken: intent.leaseToken,
          };
        });
    },
    async disableInvalidSubscriptions(input) {
      let count = 0;
      for (const subscriptionId of new Set(input.subscriptionIds)) {
        const current = subscriptions.get(subscriptionId);
        if (current?.enabled) {
          subscriptions.set(subscriptionId, { ...current, enabled: false });
          count += 1;
        }
      }
      return count;
    },
    async disableSubscription(input) {
      const current = subscriptions.get(input.subscriptionId);
      if (!current || current.userId !== input.userId || !current.enabled) {
        return false;
      }
      subscriptions.set(input.subscriptionId, { ...current, enabled: false });
      return true;
    },
    async enqueueCurrentGeneration(input) {
      const generation = cycleGenerations.get(input.cycleId) ?? 0;
      const claimed = [...intents.values()].find(
        (intent) =>
          intent.cycleId === input.cycleId &&
          intent.generation === generation &&
          intent.state !== "dead_letter",
      );
      if (claimed) {
        return { intent: toCrmPushIntent(claimed), kind: "already_claimed" };
      }
      const id = `push_intent_${String(nextIntentId).padStart(4, "0")}`;
      nextIntentId += 1;
      const intent: MemoryCrmPushIntent = {
        ...input,
        attemptCount: 0,
        generation,
        id,
        lastErrorCode: null,
        leaseExpiresAt: null,
        leaseToken: null,
        nextAttemptAt: new Date(0),
        providerNotificationId: null,
        state: "pending",
      };
      intents.set(id, intent);
      return { intent: toCrmPushIntent(intent), kind: "enqueued" };
    },
    async getSettings(input) {
      const subscription = [...subscriptions.values()]
        .filter((candidate) => candidate.userId === input.userId)
        .sort(
          (left, right) =>
            right.lastSeenAt.getTime() - left.lastSeenAt.getTime(),
        )[0];
      const preferenceEnabled =
        preferences.get(preferenceKey(input, input.userId)) ?? true;
      return {
        enabled: Boolean(subscription?.enabled && preferenceEnabled),
        preferenceEnabled,
        subscription: subscription
          ? {
              enabled: subscription.enabled,
              subscriptionId: subscription.subscriptionId,
            }
          : null,
      };
    },
    listIntents() {
      return [...intents.values()].map((intent) => ({ ...intent }));
    },
    async listRecipientCandidates(input) {
      return recipients.get(scopeKey(input)) ?? [];
    },
    async loadDeliveryContext(input) {
      return deliveryContexts.get(deliveryContextKey(input)) ?? null;
    },
    async markDeadLetter(input) {
      return mutateMemoryCrmPushLease(intents, input, (intent) => {
        intent.lastErrorCode = input.errorCode;
        intent.leaseExpiresAt = null;
        intent.leaseToken = null;
        intent.state = "dead_letter";
      });
    },
    async markDelivered(input) {
      return mutateMemoryCrmPushLease(intents, input, (intent) => {
        intent.leaseExpiresAt = null;
        intent.leaseToken = null;
        intent.providerNotificationId = input.providerNotificationId;
        intent.state = "delivered";
      });
    },
    async registerOrTransferSubscription(input) {
      const current = subscriptions.get(input.subscriptionId);
      const subscription = {
        enabled: true,
        lastSeenAt: input.now,
        subscriptionId: input.subscriptionId,
        userId: input.userId,
      };
      subscriptions.set(input.subscriptionId, subscription);
      return {
        created: current === undefined,
        subscription,
        transferredFromUserId:
          current && current.userId !== input.userId ? current.userId : null,
      };
    },
    async releaseGeneration(input) {
      const result = findMemoryCrmPushLeasedIntent(intents, input);
      if (result.kind !== "found") return result.result;
      intents.delete(result.intent.id);
      return "applied";
    },
    async retryDelivery(input) {
      return mutateMemoryCrmPushLease(intents, input, (intent) => {
        intent.lastErrorCode = input.errorCode;
        intent.leaseExpiresAt = null;
        intent.leaseToken = null;
        intent.nextAttemptAt = input.nextAttemptAt;
        intent.state = "pending";
      });
    },
    seedRecipientCandidates(scope, candidates) {
      recipients.set(scopeKey(scope), candidates);
    },
    seedDeliveryContext(context) {
      deliveryContexts.set(deliveryContextKey(context), context);
      cycleGenerations.set(context.cycleId, context.currentGeneration);
    },
    setCycleGeneration(cycleId, generation) {
      cycleGenerations.set(cycleId, generation);
    },
    async setPreference(input) {
      preferences.set(preferenceKey(input, input.userId), input.enabled);
    },
  };
  return repository;
}
