import { and, eq } from "drizzle-orm";
import { subscriptions } from "@lojaveiculosv2/db";
import type { SyncBillingProviderSubscriptionInput } from "../../../domains/billing/ports/billingWebhookRepository.js";
import { enterPastDueGrace } from "./drizzleBillingPaymentGrace.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { laterDate, periodStartFromNextDueDate } from "./billingPeriod.js";

export async function applyProviderSubscriptionLifecycle(
  db: DrizzleBillingClient,
  input: {
    currentPeriodEnd: Date | null;
    eventOccurredAt: Date | null;
    preserveLocalAccess: boolean;
    providerEventId: string | null;
    status: Exclude<SyncBillingProviderSubscriptionInput["status"], "unknown">;
    storeId: string | null;
    subscriptionId: string;
    tenantId: string;
  },
) {
  if (input.preserveLocalAccess) return;
  const [current] = await db
    .select({
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      currentPeriodStart: subscriptions.currentPeriodStart,
      providerLifecycleObservedAt: subscriptions.providerLifecycleObservedAt,
      status: subscriptions.status,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.id, input.subscriptionId),
        eq(subscriptions.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  if (!current) return;
  const observedAt = input.eventOccurredAt ?? new Date();
  if (
    !shouldApplyProviderLifecycle(current, {
      currentPeriodEnd: input.currentPeriodEnd,
      observedAt,
      status: input.status,
    })
  ) {
    return;
  }
  if (input.status === "past_due") {
    await enterPastDueGrace(db, {
      ...input,
      providerLifecycleObservedAt: observedAt,
    });
    return;
  }
  const currentPeriodStart =
    input.status === "active"
      ? laterDate(
          current.currentPeriodStart,
          periodStartFromNextDueDate(input.currentPeriodEnd),
        )
      : current.currentPeriodStart;
  await db
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
        eq(subscriptions.tenantId, input.tenantId),
      ),
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
