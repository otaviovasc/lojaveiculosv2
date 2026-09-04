import { and, eq, gte, isNull, lte, ne, or } from "drizzle-orm";
import { payments, subscriptions } from "@lojaveiculosv2/db";
import { projectSelectedEntitlements } from "./drizzleBillingEntitlementProjection.js";
import { lockEffectivePlanContract } from "./drizzleBillingContractLock.js";
import {
  currentPlanItemGrantsPaidAccess,
  findCurrentEffectivePlanItem,
} from "./drizzleBillingEffectivePlanItem.js";
import {
  enterPastDueGrace,
  providerObservationCanApply,
} from "./drizzleBillingPaymentGrace.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { renewedBillingPeriod } from "./billingPeriod.js";

export async function restorePaidSubscriptionAccess(
  db: DrizzleBillingClient,
  input: {
    dueAt: Date | null;
    paymentId: string;
    amountCents: number;
    provider: "asaas";
    providerEventId: string;
    providerLifecycleObservedAt: Date | null;
    providerSubscriptionId: string | null;
    storeId: string | null;
    subscriptionId: string;
    tenantId: string;
  },
) {
  if (!input.storeId) return false;
  await lockEffectivePlanContract(db, input.tenantId, input.storeId);
  const now = new Date();
  const lifecycleObservedAt = input.providerLifecycleObservedAt;
  const effectivePaid = await findCurrentEffectivePlanItem(db, {
    now,
    storeId: input.storeId,
    subscriptionId: input.subscriptionId,
    tenantId: input.tenantId,
  });
  if (!effectivePaid || !currentPlanItemGrantsPaidAccess(effectivePaid)) {
    return false;
  }
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
  if (
    !current ||
    !providerObservationCanApply(
      current.providerLifecycleObservedAt,
      lifecycleObservedAt,
    ) ||
    !paymentCanRestoreCurrentContract({
      amountCents: input.amountCents,
      currentPeriodEnd: current.currentPeriodEnd,
      currentPeriodStart: current.currentPeriodStart,
      dueAt: input.dueAt,
      expectedAmountCents: effectivePaid.unitAmountCents,
      provider: input.provider,
      providerSubscriptionId: input.providerSubscriptionId,
      subscriptionProvider: current.provider,
      subscriptionProviderId: current.providerSubscriptionId,
      subscriptionStatus: current.status,
    })
  ) {
    return false;
  }
  const renewedPeriod = renewedBillingPeriod(current, input.dueAt);
  const [otherOverdue] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.subscriptionId, input.subscriptionId),
        eq(payments.storeId, input.storeId),
        eq(payments.tenantId, input.tenantId),
        eq(payments.status, "overdue"),
        ne(payments.id, input.paymentId),
        gte(payments.dueAt, current.currentPeriodStart!),
        lte(payments.dueAt, current.currentPeriodEnd!),
      ),
    )
    .limit(1);
  if (otherOverdue) {
    await enterPastDueGrace(db, {
      providerEventId: input.providerEventId,
      providerLifecycleObservedAt: lifecycleObservedAt,
      currentPeriodStart: renewedPeriod.currentPeriodStart,
      expectedProvider: input.provider,
      expectedProviderSubscriptionId: input.providerSubscriptionId,
      storeId: input.storeId,
      subscriptionId: input.subscriptionId,
      tenantId: input.tenantId,
    });
    return false;
  }
  const [restored] = await db
    .update(subscriptions)
    .set({
      currentPeriodEnd: renewedPeriod.currentPeriodEnd,
      currentPeriodStart: renewedPeriod.currentPeriodStart,
      ...(lifecycleObservedAt
        ? {
            providerLifecycleEventId: input.providerEventId,
            providerLifecycleObservedAt: lifecycleObservedAt,
          }
        : {}),
      status: "active",
      updatedAt: now,
    })
    .where(
      and(
        eq(subscriptions.id, input.subscriptionId),
        eq(subscriptions.storeId, input.storeId),
        eq(subscriptions.tenantId, input.tenantId),
        eq(subscriptions.provider, current.provider),
        eq(
          subscriptions.providerSubscriptionId,
          current.providerSubscriptionId!,
        ),
        eq(subscriptions.status, current.status),
        eq(subscriptions.currentPeriodStart, current.currentPeriodStart!),
        eq(subscriptions.currentPeriodEnd, current.currentPeriodEnd!),
        ...(lifecycleObservedAt
          ? [
              or(
                isNull(subscriptions.providerLifecycleObservedAt),
                lte(
                  subscriptions.providerLifecycleObservedAt,
                  lifecycleObservedAt,
                ),
              ),
            ]
          : [isNull(subscriptions.providerLifecycleObservedAt)]),
      ),
    )
    .returning({ id: subscriptions.id });
  if (!restored) return false;
  await projectSelectedEntitlements(db, {
    source: "billing_plan_hire",
    storeId: input.storeId,
    subscriptionId: input.subscriptionId,
    tenantId: input.tenantId,
  });
  return true;
}

export function paymentCanRestoreCurrentContract(input: {
  amountCents: number;
  currentPeriodEnd: Date | null;
  currentPeriodStart: Date | null;
  dueAt: Date | null;
  expectedAmountCents: number;
  provider: string;
  providerSubscriptionId: string | null;
  subscriptionProvider: string;
  subscriptionProviderId: string | null;
  subscriptionStatus: (typeof subscriptions.$inferSelect)["status"];
}) {
  return Boolean(
    (input.subscriptionStatus === "active" ||
      input.subscriptionStatus === "past_due") &&
    input.currentPeriodStart &&
    input.currentPeriodEnd &&
    input.dueAt &&
    input.dueAt > input.currentPeriodStart &&
    input.dueAt <= input.currentPeriodEnd &&
    input.amountCents === input.expectedAmountCents &&
    input.provider === input.subscriptionProvider &&
    input.providerSubscriptionId &&
    input.providerSubscriptionId === input.subscriptionProviderId,
  );
}
