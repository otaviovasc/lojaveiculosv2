import { and, eq, isNull } from "drizzle-orm";
import { subscriptions } from "@lojaveiculosv2/db";
import type { SyncBillingProviderSubscriptionInput } from "../../../domains/billing/ports/billingWebhookRepository.js";
import { enterPastDueGrace } from "./drizzleBillingPaymentGrace.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { laterDate, periodStartFromNextDueDate } from "./billingPeriod.js";
import { lockEffectivePlanContract } from "./drizzleBillingContractLock.js";

export async function applyProviderSubscriptionLifecycle(
  db: DrizzleBillingClient,
  input: {
    currentPeriodEnd: Date | null;
    eventOccurredAt: Date | null;
    expectedProvider: string;
    expectedProviderSubscriptionId: string;
    preserveLocalAccess: boolean;
    providerEventId: string | null;
    status: Exclude<SyncBillingProviderSubscriptionInput["status"], "unknown">;
    storeId: string;
    subscriptionId: string;
    tenantId: string;
  },
): Promise<"applied" | "conflict" | "ignored" | "preserved"> {
  await lockEffectivePlanContract(db, input.tenantId, input.storeId);
  const [current] = await db
    .select({
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      currentPeriodStart: subscriptions.currentPeriodStart,
      provider: subscriptions.provider,
      providerSubscriptionId: subscriptions.providerSubscriptionId,
      providerLifecycleObservedAt: subscriptions.providerLifecycleObservedAt,
      status: subscriptions.status,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.id, input.subscriptionId),
        eq(subscriptions.storeId, input.storeId),
        eq(subscriptions.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  if (!current || !subscriptionLifecycleIdentityMatches(current, input)) {
    return "conflict";
  }
  if (input.preserveLocalAccess) return "preserved";
  const observedAt = input.eventOccurredAt ?? new Date();
  if (
    !shouldApplyProviderLifecycle(current, {
      currentPeriodEnd: input.currentPeriodEnd,
      observedAt,
      status: input.status,
    })
  ) {
    return "ignored";
  }
  if (input.status === "past_due") {
    const applied = await enterPastDueGrace(db, {
      ...input,
      expectedProvider: input.expectedProvider,
      expectedProviderSubscriptionId: input.expectedProviderSubscriptionId,
      providerLifecycleObservedAt: observedAt,
    });
    return applied ? "applied" : "ignored";
  }
  const currentPeriodStart =
    input.status === "active"
      ? laterDate(
          current.currentPeriodStart,
          periodStartFromNextDueDate(input.currentPeriodEnd),
        )
      : current.currentPeriodStart;
  const [updated] = await db
    .update(subscriptions)
    .set({
      currentPeriodEnd: input.currentPeriodEnd,
      currentPeriodStart,
      providerLifecycleEventId: input.providerEventId,
      providerLifecycleObservedAt: observedAt,
      status: input.status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(subscriptions.id, input.subscriptionId),
        eq(subscriptions.storeId, input.storeId),
        eq(subscriptions.tenantId, input.tenantId),
        eq(subscriptions.provider, input.expectedProvider),
        eq(
          subscriptions.providerSubscriptionId,
          input.expectedProviderSubscriptionId,
        ),
        eq(subscriptions.status, current.status),
        current.providerLifecycleObservedAt
          ? eq(
              subscriptions.providerLifecycleObservedAt,
              current.providerLifecycleObservedAt,
            )
          : isNull(subscriptions.providerLifecycleObservedAt),
      ),
    )
    .returning({ id: subscriptions.id });
  return updated ? "applied" : "conflict";
}

export function subscriptionLifecycleIdentityMatches(
  current: {
    provider: string;
    providerSubscriptionId: string | null;
  } | null,
  expected: {
    expectedProvider: string;
    expectedProviderSubscriptionId: string;
  },
) {
  return Boolean(
    current &&
    current.provider === expected.expectedProvider &&
    current.providerSubscriptionId === expected.expectedProviderSubscriptionId,
  );
}

export function shouldApplyProviderLifecycle(
  current: {
    currentPeriodEnd: Date | null;
    providerLifecycleObservedAt: Date | null;
    status: (typeof subscriptions.$inferSelect)["status"];
  },
  incoming: {
    currentPeriodEnd: Date | null;
    observedAt: Date;
    status: Exclude<SyncBillingProviderSubscriptionInput["status"], "unknown">;
  },
) {
  if (
    current.providerLifecycleObservedAt &&
    incoming.observedAt < current.providerLifecycleObservedAt
  ) {
    return false;
  }
  if (
    incoming.status === "active" &&
    ["cancelled", "expired", "past_due"].includes(current.status)
  ) {
    return false;
  }
  if (
    ["cancelled", "expired"].includes(current.status) &&
    incoming.status === "past_due"
  ) {
    return false;
  }
  return !(
    incoming.status === "active" &&
    current.currentPeriodEnd &&
    (!incoming.currentPeriodEnd ||
      incoming.currentPeriodEnd < current.currentPeriodEnd)
  );
}
