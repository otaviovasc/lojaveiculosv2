import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import {
  billingPlanHires,
  subscriptionItems,
  subscriptions,
} from "@lojaveiculosv2/db";
import type { UpsertBillingProviderPaymentInput } from "../../../domains/billing/ports/billingWebhookRepository.js";
import { enterPastDueGrace } from "./drizzleBillingPaymentGrace.js";
import { markHireReconciliationFailed } from "./drizzleBillingPaymentHireState.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import type { resolvePaymentScope } from "./drizzleBillingWebhookScope.js";

export async function handleRefundedPayment(
  db: DrizzleBillingClient,
  args: {
    input: UpsertBillingProviderPaymentInput;
    scope: Awaited<ReturnType<typeof resolvePaymentScope>> & {};
  },
) {
  const { input, scope } = args;
  const now = new Date();
  if (!scope.subscriptionId || !scope.storeId) return;
  let hire: typeof billingPlanHires.$inferSelect | null = null;
  if (scope.hireId) {
    const [resolvedHire] = await db
      .select()
      .from(billingPlanHires)
      .where(
        and(
          eq(billingPlanHires.id, scope.hireId),
          eq(billingPlanHires.tenantId, scope.tenantId),
          eq(billingPlanHires.storeId, scope.storeId),
          eq(billingPlanHires.subscriptionId, scope.subscriptionId),
        ),
      )
      .limit(1);
    hire = resolvedHire ?? null;
  }
  const [effectivePaid] = await db
    .select({ id: subscriptionItems.id })
    .from(subscriptionItems)
    .where(
      and(
        eq(subscriptionItems.subscriptionId, scope.subscriptionId),
        eq(subscriptionItems.tenantId, scope.tenantId),
        eq(subscriptionItems.storeId, scope.storeId),
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
  const [currentPeriod] = await db
    .select({
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      currentPeriodStart: subscriptions.currentPeriodStart,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.id, scope.subscriptionId),
        eq(subscriptions.storeId, scope.storeId),
        eq(subscriptions.tenantId, scope.tenantId),
      ),
    )
    .limit(1);
  const affectsEffectiveContract = refundAffectsEffectiveContract({
    currentPeriodEnd: currentPeriod?.currentPeriodEnd ?? null,
    currentPeriodStart: currentPeriod?.currentPeriodStart ?? null,
    effectiveItemId: effectivePaid?.id ?? null,
    hireEffectiveItemId: hire?.effectiveSubscriptionItemId ?? null,
    paymentOccurredAt: input.paidAt ?? input.dueAt,
  });
  const hireDecision = refundedHireDecision(hire, now);
  const mayFailHire =
    hire?.status !== "paid_active" || affectsEffectiveContract;
  if (hire && mayFailHire && hireDecision.markReconciliationFailed) {
    await markHireReconciliationFailed(db, hire, input, "payment_refunded");
    if (hireDecision.cancelScheduledPlan) {
      await cancelScheduledRefundedPlan(db, hire, now);
    }
  }
  if (!refundRequiresGrace(affectsEffectiveContract)) return;
  await enterPastDueGrace(db, {
    providerEventId: input.providerEventId,
    providerLifecycleObservedAt: now,
    storeId: scope.storeId,
    subscriptionId: scope.subscriptionId,
    tenantId: scope.tenantId,
  });
}

export function refundedHireDecision(
  hire: Pick<
    typeof billingPlanHires.$inferSelect,
    "effectiveAt" | "effectiveSubscriptionItemId" | "status"
  > | null,
  now: Date,
) {
  return {
    cancelScheduledPlan: Boolean(
      hire?.status === "activation_pending" &&
      hire.effectiveSubscriptionItemId &&
      hire.effectiveAt &&
      hire.effectiveAt > now,
    ),
    markReconciliationFailed: Boolean(
      hire && hire.status !== "reconciliation_failed",
    ),
  };
}

export function refundRequiresGrace(hasEffectivePaidPlan: boolean) {
  return hasEffectivePaidPlan;
}

export function refundAffectsEffectiveContract(input: {
  currentPeriodEnd: Date | null;
  currentPeriodStart: Date | null;
  effectiveItemId: string | null;
  hireEffectiveItemId: string | null;
  paymentOccurredAt: Date | null;
}) {
  if (
    !input.effectiveItemId ||
    input.hireEffectiveItemId !== input.effectiveItemId ||
    !input.currentPeriodStart ||
    !input.paymentOccurredAt
  ) {
    return false;
  }
  const paymentDay = utcBillingDay(input.paymentOccurredAt);
  const periodStartDay = utcBillingDay(input.currentPeriodStart);
  const periodEndDay = input.currentPeriodEnd
    ? utcBillingDay(input.currentPeriodEnd)
    : null;
  return (
    paymentDay >= periodStartDay &&
    (periodEndDay === null || paymentDay < periodEndDay)
  );
}

function utcBillingDay(value: Date) {
  return Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate(),
  );
}

async function cancelScheduledRefundedPlan(
  db: DrizzleBillingClient,
  hire: typeof billingPlanHires.$inferSelect,
  now: Date,
) {
  if (
    hire.status !== "activation_pending" ||
    !hire.effectiveSubscriptionItemId ||
    !hire.effectiveAt ||
    hire.effectiveAt <= now
  ) {
    return;
  }
  await db
    .update(billingPlanHires)
    .set({ effectiveSubscriptionItemId: null, updatedAt: now })
    .where(
      and(
        eq(billingPlanHires.id, hire.id),
        eq(billingPlanHires.status, "reconciliation_failed"),
      ),
    );
  await db
    .delete(subscriptionItems)
    .where(
      and(
        eq(subscriptionItems.id, hire.effectiveSubscriptionItemId),
        gt(subscriptionItems.startsAt, now),
      ),
    );
  await db
    .update(subscriptionItems)
    .set({ endsAt: null, updatedAt: now })
    .where(
      and(
        eq(subscriptionItems.subscriptionId, hire.subscriptionId),
        eq(subscriptionItems.storeId, hire.storeId),
        eq(subscriptionItems.tenantId, hire.tenantId),
        eq(subscriptionItems.itemType, "plan"),
        eq(subscriptionItems.endsAt, hire.effectiveAt),
        or(
          isNull(subscriptionItems.startsAt),
          lte(subscriptionItems.startsAt, now),
        ),
      ),
    );
}
