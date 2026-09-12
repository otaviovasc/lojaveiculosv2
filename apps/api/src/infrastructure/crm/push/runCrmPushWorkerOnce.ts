import { randomUUID } from "node:crypto";
import type { CrmPushDeliveryProvider } from "../../../domains/crm/ports/crmPushDeliveryProvider.js";
import type {
  CrmPushIntentLease,
  CrmPushRepository,
} from "../../../domains/crm/ports/crmPushRepository.js";
import {
  buildCrmPushPayload,
  resolveCrmPushRecipients,
} from "../../../domains/crm/push/pushPolicy.js";
import { resolveCrmPushIconUrl } from "./crmPushIconUrl.js";

export type RunCrmPushWorkerInput = {
  batchSize: number;
  leaseDurationMs: number;
  maxAttempts: number;
  now?: Date;
  provider: CrmPushDeliveryProvider;
  publicAppUrl: string;
  repository: CrmPushRepository;
  workerId?: string;
};

export type CrmPushWorkerResult = {
  claimed: number;
  deadLettered: number;
  delivered: number;
  released: number;
  retried: number;
  staleLease: number;
};

export async function runCrmPushWorkerOnce(
  input: RunCrmPushWorkerInput,
): Promise<CrmPushWorkerResult> {
  const now = input.now ?? new Date();
  const leases = await input.repository.claimDeliveryBatch({
    leaseDurationMs: input.leaseDurationMs,
    limit: input.batchSize,
    now,
    workerId: input.workerId ?? randomUUID(),
  });
  const result: CrmPushWorkerResult = {
    claimed: leases.length,
    deadLettered: 0,
    delivered: 0,
    released: 0,
    retried: 0,
    staleLease: 0,
  };
  await Promise.all(
    leases.map((lease) => processLease(input, lease, now, result)),
  );
  return result;
}

async function processLease(
  input: RunCrmPushWorkerInput,
  lease: CrmPushIntentLease,
  now: Date,
  totals: CrmPushWorkerResult,
): Promise<void> {
  const context = await input.repository.loadDeliveryContext(lease);
  if (!context) {
    await applyLeaseOutcome(
      input.repository.markDeadLetter({
        errorCode: "delivery_context_missing",
        failedAt: now,
        intentId: lease.id,
        leaseToken: lease.leaseToken,
      }),
      totals,
      "deadLettered",
    );
    return;
  }
  if (context.currentGeneration !== lease.generation) {
    await applyLeaseOutcome(
      input.repository.releaseGeneration({
        intentId: lease.id,
        leaseToken: lease.leaseToken,
        reason: "stale_generation",
        releasedAt: now,
      }),
      totals,
      "released",
    );
    return;
  }

  const candidates = await input.repository.listRecipientCandidates({
    assignedUserId: context.assignedUserId,
    storeId: context.storeId,
    tenantId: context.tenantId,
  });
  const recipients = resolveCrmPushRecipients({
    assignedUserId: context.assignedUserId,
    candidates,
  });
  if (!recipients.subscriptionIds.length) {
    const hasEligibleUser = candidates.some((candidate) =>
      isEligibleCandidate(context.assignedUserId, candidate),
    );
    await applyLeaseOutcome(
      input.repository.releaseGeneration({
        intentId: lease.id,
        leaseToken: lease.leaseToken,
        reason: hasEligibleUser ? "no_subscriptions" : "no_eligible_recipients",
        releasedAt: now,
      }),
      totals,
      "released",
    );
    return;
  }

  const publicAppUrl = input.publicAppUrl.replace(/\/$/, "");
  const payload = buildCrmPushPayload({
    buyerName: context.buyerName,
    connectionId: context.connectionId,
    content: context.content,
    cycleId: context.cycleId,
    iconUrl: resolveCrmPushIconUrl(context.profilePhotoUrl, publicAppUrl),
    idempotencyKey: lease.idempotencyKey,
    messageType: context.messageType,
    storeSlug: context.storeSlug,
    subscriptionIds: recipients.subscriptionIds,
    traceId: lease.id,
    webUrl: `${publicAppUrl}/crm?storeSlug=${encodeURIComponent(context.storeSlug)}&cycleId=${encodeURIComponent(context.cycleId)}`,
  });
  const delivery = await input.provider.send(payload);
  if (delivery.kind !== "retryable_failure") {
    await input.repository.disableInvalidSubscriptions({
      subscriptionIds: delivery.invalidSubscriptionIds,
    });
  }
  if (delivery.kind === "accepted") {
    await applyLeaseOutcome(
      input.repository.markDelivered({
        deliveredAt: now,
        intentId: lease.id,
        leaseToken: lease.leaseToken,
        providerNotificationId: delivery.providerNotificationId,
      }),
      totals,
      "delivered",
    );
    return;
  }
  if (
    delivery.kind === "permanent_failure" &&
    allSubscriptionsInvalid(
      payload.subscriptionIds,
      delivery.invalidSubscriptionIds,
    )
  ) {
    await applyLeaseOutcome(
      input.repository.releaseGeneration({
        intentId: lease.id,
        leaseToken: lease.leaseToken,
        reason: "no_subscriptions",
        releasedAt: now,
      }),
      totals,
      "released",
    );
    return;
  }
  if (
    delivery.kind === "permanent_failure" ||
    lease.attemptCount >= input.maxAttempts
  ) {
    await applyLeaseOutcome(
      input.repository.markDeadLetter({
        errorCode: delivery.errorCode,
        failedAt: now,
        intentId: lease.id,
        leaseToken: lease.leaseToken,
      }),
      totals,
      "deadLettered",
    );
    return;
  }
  const backoffMs = Math.max(
    retryBackoffMs(lease.attemptCount),
    delivery.retryAfterMs ?? 0,
  );
  await applyLeaseOutcome(
    input.repository.retryDelivery({
      errorCode: delivery.errorCode,
      intentId: lease.id,
      leaseToken: lease.leaseToken,
      nextAttemptAt: new Date(now.getTime() + backoffMs),
    }),
    totals,
    "retried",
  );
}

function allSubscriptionsInvalid(
  targeted: readonly string[],
  invalid: readonly string[],
): boolean {
  if (!targeted.length || !invalid.length) return false;
  const invalidSet = new Set(invalid);
  return targeted.every((subscriptionId) => invalidSet.has(subscriptionId));
}

function isEligibleCandidate(
  assignedUserId: string | null,
  candidate: {
    activeMembership: boolean;
    canReadConversations: boolean;
    hasGlobalQueueVisibility: boolean;
    preferenceEnabled: boolean;
    userId: string;
  },
): boolean {
  return (
    candidate.activeMembership &&
    candidate.canReadConversations &&
    candidate.preferenceEnabled &&
    (assignedUserId
      ? candidate.userId === assignedUserId
      : candidate.hasGlobalQueueVisibility)
  );
}

function retryBackoffMs(attemptCount: number): number {
  return Math.min(15 * 60_000, 15_000 * 2 ** Math.max(0, attemptCount - 1));
}

async function applyLeaseOutcome(
  mutation: Promise<"applied" | "not_found" | "stale_lease">,
  totals: CrmPushWorkerResult,
  counter: "deadLettered" | "delivered" | "released" | "retried",
): Promise<void> {
  const outcome = await mutation;
  if (outcome === "applied") totals[counter] += 1;
  else totals.staleLease += 1;
}
