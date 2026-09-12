import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import {
  billingPlanHires,
  billingPlanHireTransitions,
  subscriptionItems,
} from "@lojaveiculosv2/db";
import type { subscriptions } from "@lojaveiculosv2/db";
import { enqueueBillingAudit } from "./drizzleBillingAuditOutboxMutation.js";
import { projectSelectedEntitlements } from "./drizzleBillingEntitlementProjection.js";
import { recordBillingProductEvent } from "./drizzleBillingProductEvents.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export async function fallbackStoreToFree(
  db: DrizzleBillingClient,
  subscription: typeof subscriptions.$inferSelect,
  storeId: string,
  freePlanId: string,
  now: Date,
) {
  const [effectivePaidItem] = await db
    .select({ id: subscriptionItems.id })
    .from(subscriptionItems)
    .where(
      and(
        eq(subscriptionItems.subscriptionId, subscription.id),
        eq(subscriptionItems.storeId, storeId),
        eq(subscriptionItems.tenantId, subscription.tenantId),
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
  const paidHires = effectivePaidItem
    ? await db
        .select()
        .from(billingPlanHires)
        .where(
          and(
            eq(billingPlanHires.subscriptionId, subscription.id),
            eq(billingPlanHires.storeId, storeId),
            eq(billingPlanHires.tenantId, subscription.tenantId),
            eq(billingPlanHires.status, "paid_active"),
          ),
        )
    : [];
  const activePaidHires = effectivePaidItem
    ? paidHires.filter((hire) =>
        paidHireBelongsToEffectiveItem(hire, effectivePaidItem.id),
      )
    : [];
  const [existingFree] = await db
    .select({ id: subscriptionItems.id })
    .from(subscriptionItems)
    .where(
      and(
        eq(subscriptionItems.subscriptionId, subscription.id),
        eq(subscriptionItems.storeId, storeId),
        eq(subscriptionItems.itemType, "plan"),
        eq(subscriptionItems.planId, freePlanId),
        eq(subscriptionItems.unitAmountCents, 0),
        isNull(subscriptionItems.endsAt),
      ),
    )
    .limit(1);
  await db
    .update(subscriptionItems)
    .set({ endsAt: now, updatedAt: now })
    .where(
      and(
        eq(subscriptionItems.subscriptionId, subscription.id),
        eq(subscriptionItems.storeId, storeId),
        eq(subscriptionItems.itemType, "plan"),
        or(
          isNull(subscriptionItems.startsAt),
          lte(subscriptionItems.startsAt, now),
        ),
        or(isNull(subscriptionItems.endsAt), gt(subscriptionItems.endsAt, now)),
      ),
    );
  if (existingFree) {
    await db
      .update(subscriptionItems)
      .set({ endsAt: null, startsAt: now, updatedAt: now })
      .where(eq(subscriptionItems.id, existingFree.id));
  } else {
    await db.insert(subscriptionItems).values({
      itemType: "plan",
      planId: freePlanId,
      quantity: 1,
      startsAt: now,
      storeId,
      subscriptionId: subscription.id,
      tenantId: subscription.tenantId,
      unitAmountCents: 0,
    });
  }
  await failPaidHiresAfterFallback(db, activePaidHires, now);
  await projectSelectedEntitlements(db, {
    source: "billing_plan_hire",
    storeId,
    subscriptionId: subscription.id,
    tenantId: subscription.tenantId,
  });
  await recordFallbackEvidence(db, subscription, storeId, now);
}

export function paidHireBelongsToEffectiveItem(
  hire: Pick<
    typeof billingPlanHires.$inferSelect,
    "effectiveSubscriptionItemId"
  >,
  effectiveItemId: string,
) {
  return hire.effectiveSubscriptionItemId === effectiveItemId;
}

async function recordFallbackEvidence(
  db: DrizzleBillingClient,
  subscription: typeof subscriptions.$inferSelect,
  storeId: string,
  now: Date,
) {
  await recordBillingProductEvent(db, {
    eventName: "free_fallback",
    idempotencyKey: `billing-free-fallback:${subscription.id}:${storeId}:${now.toISOString()}`,
    properties: { reason: "grace_expired" },
    storeId,
    tenantId: subscription.tenantId,
  });
  await enqueueBillingAudit(
    db,
    freeFallbackAuditRecord(subscription, storeId, now),
  );
}

export function freeFallbackAuditRecord(
  subscription: Pick<
    typeof subscriptions.$inferSelect,
    "currentPeriodEnd" | "id" | "tenantId"
  >,
  storeId: string,
  now: Date,
) {
  const identity =
    subscription.currentPeriodEnd?.toISOString() ?? now.toISOString();
  return {
    action: "billing.subscription.free_fallback",
    audit: {
      actorId: "billing_provider_reconciliation",
      actorKind: "system" as const,
      requestId: `billing_free_fallback_${subscription.id}`,
    },
    entityId: subscription.id,
    entityType: "subscription" as const,
    idempotencyKey: `billing-audit:fallback:${subscription.id}:${storeId}:${identity}`,
    metadata: {
      reason: "grace_expired",
      status: "free_active",
      subscriptionId: subscription.id,
    },
    occurredAt: now,
    storeId,
    tenantId: subscription.tenantId,
  } as const;
}

async function failPaidHiresAfterFallback(
  db: DrizzleBillingClient,
  hires: Array<typeof billingPlanHires.$inferSelect>,
  now: Date,
) {
  for (const hire of hires) {
    const [transitioned] = await db
      .update(billingPlanHires)
      .set({
        failureCode: "grace_expired_free_fallback",
        status: "reconciliation_failed",
        updatedAt: now,
      })
      .where(
        and(
          eq(billingPlanHires.id, hire.id),
          eq(billingPlanHires.subscriptionId, hire.subscriptionId),
          eq(billingPlanHires.storeId, hire.storeId),
          eq(billingPlanHires.tenantId, hire.tenantId),
          eq(billingPlanHires.status, "paid_active"),
        ),
      )
      .returning({ id: billingPlanHires.id });
    if (!transitioned) continue;
    await db.insert(billingPlanHireTransitions).values({
      failureCode: "grace_expired_free_fallback",
      fromStatus: "paid_active",
      hireId: hire.id,
      metadata: { effectiveAt: now.toISOString() },
      storeId: hire.storeId,
      tenantId: hire.tenantId,
      toStatus: "reconciliation_failed",
    });
  }
}
