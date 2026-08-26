import { and, eq, gt, gte, isNull, lte, ne, or } from "drizzle-orm";
import { payments, subscriptionItems, subscriptions } from "@lojaveiculosv2/db";
import { projectSelectedEntitlements } from "./drizzleBillingEntitlementProjection.js";
import { enterPastDueGrace } from "./drizzleBillingPaymentGrace.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { renewedBillingPeriod } from "./billingPeriod.js";

export async function restorePaidSubscriptionAccess(
  db: DrizzleBillingClient,
  input: {
    dueAt: Date | null;
    paymentId: string;
    providerEventId: string;
    storeId: string | null;
    subscriptionId: string;
    tenantId: string;
  },
) {
  const now = new Date();
  const [effectivePaid] = await db
    .select({ id: subscriptionItems.id })
    .from(subscriptionItems)
    .where(
      and(
        eq(subscriptionItems.subscriptionId, input.subscriptionId),
        eq(subscriptionItems.itemType, "plan"),
        gt(subscriptionItems.unitAmountCents, 0),
        or(
          isNull(subscriptionItems.startsAt),
          lte(subscriptionItems.startsAt, now),
        ),
        or(isNull(subscriptionItems.endsAt), gt(subscriptionItems.endsAt, now)),
      ),
    )
    .limit(1);
  if (!effectivePaid) return;
  const [current] = await db
    .select({
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      currentPeriodStart: subscriptions.currentPeriodStart,
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
  const renewedPeriod = renewedBillingPeriod(current, input.dueAt);
  const [otherOverdue] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.subscriptionId, input.subscriptionId),
        eq(payments.status, "overdue"),
        ne(payments.id, input.paymentId),
        ...(renewedPeriod.currentPeriodStart
          ? [gte(payments.dueAt, renewedPeriod.currentPeriodStart)]
          : []),
      ),
    )
    .limit(1);
  if (otherOverdue) {
    await enterPastDueGrace(db, {
      providerEventId: input.providerEventId,
      providerLifecycleObservedAt: now,
      currentPeriodStart: renewedPeriod.currentPeriodStart,
      storeId: input.storeId,
      subscriptionId: input.subscriptionId,
      tenantId: input.tenantId,
    });
    return;
  }
  await db
    .update(subscriptions)
    .set({
      currentPeriodEnd: renewedPeriod.currentPeriodEnd,
      currentPeriodStart: renewedPeriod.currentPeriodStart,
      providerLifecycleEventId: input.providerEventId,
      providerLifecycleObservedAt: now,
      status: "active",
      updatedAt: now,
    })
    .where(
      and(
        eq(subscriptions.id, input.subscriptionId),
        eq(subscriptions.tenantId, input.tenantId),
      ),
    );
  if (input.storeId) {
    await projectSelectedEntitlements(db, {
      source: "billing_plan_hire",
      storeId: input.storeId,
      subscriptionId: input.subscriptionId,
      tenantId: input.tenantId,
    });
  }
}

export async function overduePaymentCanEnterGrace(
  db: DrizzleBillingClient,
  input: { dueAt: Date | null; subscriptionId: string; tenantId: string },
) {
  const [current] = await db
    .select({ currentPeriodStart: subscriptions.currentPeriodStart })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.id, input.subscriptionId),
        eq(subscriptions.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  return overdueEvidenceCanEnterGrace(
    current?.currentPeriodStart ?? null,
    input.dueAt,
  );
}

export function overdueEvidenceCanEnterGrace(
  currentPeriodStart: Date | null,
  dueAt: Date | null,
) {
  return Boolean(dueAt && (!currentPeriodStart || dueAt >= currentPeriodStart));
}
