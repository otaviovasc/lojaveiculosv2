import { and, eq, inArray, isNull, lte, or } from "drizzle-orm";
import {
  billingPlanHires,
  billingPlanHireTransitions,
  subscriptions,
} from "@lojaveiculosv2/db";
import type { UpsertBillingProviderPaymentInput } from "../../../domains/billing/ports/billingWebhookRepository.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export async function bindScheduledProviderSubscription(
  db: DrizzleBillingClient,
  hire: typeof billingPlanHires.$inferSelect,
  input: UpsertBillingProviderPaymentInput,
  observedAt: Date,
) {
  const providerSubscriptionId = input.providerSubscriptionId;
  if (!providerSubscriptionId) {
    await failScheduledProviderBinding(db, hire, observedAt);
    return false;
  }
  const [current] = await db
    .select({
      provider: subscriptions.provider,
      providerLifecycleObservedAt: subscriptions.providerLifecycleObservedAt,
      providerSubscriptionId: subscriptions.providerSubscriptionId,
      status: subscriptions.status,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.id, hire.subscriptionId),
        eq(subscriptions.storeId, hire.storeId),
        eq(subscriptions.tenantId, hire.tenantId),
      ),
    )
    .limit(1);
  if (
    !current ||
    !providerSubscriptionCanBind({
      currentProvider: current.provider,
      currentProviderSubscriptionId: current.providerSubscriptionId,
      currentStatus: current.status,
      incomingProvider: input.provider,
      incomingProviderSubscriptionId: providerSubscriptionId,
    })
  ) {
    await failScheduledProviderBinding(db, hire, observedAt);
    return false;
  }
  const [bound] = await db
    .update(subscriptions)
    .set({
      provider: input.provider,
      providerLifecycleEventId: input.providerEventId,
      providerLifecycleObservedAt: input.providerEventOccurredAt ?? observedAt,
      providerSubscriptionId,
      updatedAt: observedAt,
    })
    .where(
      and(
        eq(subscriptions.id, hire.subscriptionId),
        eq(subscriptions.storeId, hire.storeId),
        eq(subscriptions.tenantId, hire.tenantId),
        eq(subscriptions.provider, input.provider),
        inArray(subscriptions.status, ["active", "past_due"]),
        or(
          isNull(subscriptions.providerSubscriptionId),
          eq(subscriptions.providerSubscriptionId, providerSubscriptionId),
        ),
        or(
          isNull(subscriptions.providerLifecycleObservedAt),
          lte(
            subscriptions.providerLifecycleObservedAt,
            input.providerEventOccurredAt ?? observedAt,
          ),
        ),
      ),
    )
    .returning({ id: subscriptions.id });
  if (bound) return true;
  await failScheduledProviderBinding(db, hire, observedAt);
  return false;
}

export function providerSubscriptionCanBind(input: {
  currentProvider: string;
  currentProviderSubscriptionId: string | null;
  currentStatus: (typeof subscriptions.$inferSelect)["status"];
  incomingProvider: string;
  incomingProviderSubscriptionId: string | null;
}) {
  return Boolean(
    (input.currentStatus === "active" || input.currentStatus === "past_due") &&
    input.currentProvider === input.incomingProvider &&
    input.incomingProviderSubscriptionId &&
    (!input.currentProviderSubscriptionId ||
      input.currentProviderSubscriptionId ===
        input.incomingProviderSubscriptionId),
  );
}

export async function failScheduledProviderBinding(
  db: DrizzleBillingClient,
  hire: typeof billingPlanHires.$inferSelect,
  observedAt: Date,
) {
  const [failed] = await db
    .update(billingPlanHires)
    .set({
      failureCode: "provider_subscription_binding_conflict",
      status: "reconciliation_failed",
      updatedAt: observedAt,
    })
    .where(
      and(
        eq(billingPlanHires.id, hire.id),
        eq(billingPlanHires.storeId, hire.storeId),
        eq(billingPlanHires.subscriptionId, hire.subscriptionId),
        eq(billingPlanHires.tenantId, hire.tenantId),
        eq(billingPlanHires.status, hire.status),
      ),
    )
    .returning({ id: billingPlanHires.id });
  if (!failed) return;
  await db.insert(billingPlanHireTransitions).values({
    fromStatus: hire.status,
    hireId: hire.id,
    metadata: { reason: "provider_subscription_binding_conflict" },
    storeId: hire.storeId,
    tenantId: hire.tenantId,
    toStatus: "reconciliation_failed",
  });
}
