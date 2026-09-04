import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import {
  billingPlanHires,
  billingPlanHireTransitions,
  subscriptionItems,
} from "@lojaveiculosv2/db";
import type { plans, subscriptions } from "@lojaveiculosv2/db";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export async function scheduleFreePlanContract(
  db: DrizzleBillingClient,
  input: {
    effectiveAt?: Date;
    plan: typeof plans.$inferSelect;
    storeId: string;
    subscription: typeof subscriptions.$inferSelect;
    tenantId: string;
  },
): Promise<{ itemId: string; status: "downgrade_scheduled" | "paid_active" }> {
  const now = new Date();
  const active = await findEffectivePlanItems(db, input);
  const same = active.find((item) => item.planId === input.plan.id);
  if (same) return { itemId: same.id, status: "paid_active" };
  const currentPaid = active.find((item) => item.unitAmountCents > 0);
  const startsAt = currentPaid
    ? (input.effectiveAt ?? input.subscription.currentPeriodEnd ?? now)
    : now;
  if (currentPaid) {
    await db
      .update(subscriptionItems)
      .set({ endsAt: startsAt, updatedAt: now })
      .where(eq(subscriptionItems.id, currentPaid.id));
  } else if (active.length) {
    await db
      .update(subscriptionItems)
      .set({ endsAt: now, updatedAt: now })
      .where(eq(subscriptionItems.id, active[0]!.id));
  }
  const [item] = await db
    .insert(subscriptionItems)
    .values({
      itemType: "plan",
      planId: input.plan.id,
      quantity: 1,
      startsAt,
      storeId: input.storeId,
      subscriptionId: input.subscription.id,
      tenantId: input.tenantId,
      unitAmountCents: 0,
    })
    .returning({ id: subscriptionItems.id });
  if (!item) throw new Error("Free plan contract was not persisted.");
  return {
    itemId: item.id,
    status: currentPaid ? "downgrade_scheduled" : "paid_active",
  };
}

export function findEffectivePlanItems(
  db: DrizzleBillingClient,
  input: { storeId: string; tenantId: string },
) {
  const now = new Date();
  return db
    .select()
    .from(subscriptionItems)
    .where(
      and(
        eq(subscriptionItems.itemType, "plan"),
        eq(subscriptionItems.storeId, input.storeId),
        eq(subscriptionItems.tenantId, input.tenantId),
        or(
          isNull(subscriptionItems.startsAt),
          lte(subscriptionItems.startsAt, now),
        ),
        or(isNull(subscriptionItems.endsAt), gt(subscriptionItems.endsAt, now)),
      ),
    );
}

export async function supersedeScheduledFreePlanContracts(
  db: DrizzleBillingClient,
  input: {
    replacementAt: Date;
    storeId: string;
    supersedingHireId: string;
    tenantId: string;
  },
) {
  const scheduled = await db
    .select({ hire: billingPlanHires, item: subscriptionItems })
    .from(billingPlanHires)
    .innerJoin(
      subscriptionItems,
      eq(subscriptionItems.id, billingPlanHires.effectiveSubscriptionItemId),
    )
    .where(
      and(
        eq(billingPlanHires.status, "downgrade_scheduled"),
        eq(billingPlanHires.storeId, input.storeId),
        eq(billingPlanHires.tenantId, input.tenantId),
        eq(subscriptionItems.itemType, "plan"),
        eq(subscriptionItems.unitAmountCents, 0),
        or(
          isNull(subscriptionItems.endsAt),
          gt(subscriptionItems.endsAt, input.replacementAt),
        ),
      ),
    );
  let superseded = 0;
  for (const candidate of scheduled) {
    const [cancelled] = await db
      .update(billingPlanHires)
      .set({
        completedAt: input.replacementAt,
        effectiveSubscriptionItemId: null,
        failureCode: "superseded_by_paid_hire",
        status: "cancelled",
        updatedAt: input.replacementAt,
      })
      .where(
        and(
          eq(billingPlanHires.id, candidate.hire.id),
          eq(billingPlanHires.status, "downgrade_scheduled"),
        ),
      )
      .returning({ id: billingPlanHires.id });
    if (!cancelled) continue;
    await db.insert(billingPlanHireTransitions).values({
      failureCode: "superseded_by_paid_hire",
      fromStatus: "downgrade_scheduled",
      hireId: candidate.hire.id,
      metadata: { supersedingHireId: input.supersedingHireId },
      storeId: candidate.hire.storeId,
      tenantId: candidate.hire.tenantId,
      toStatus: "cancelled",
    });
    if (
      candidate.item.startsAt &&
      candidate.item.startsAt < input.replacementAt
    ) {
      await db
        .update(subscriptionItems)
        .set({ endsAt: input.replacementAt, updatedAt: input.replacementAt })
        .where(eq(subscriptionItems.id, candidate.item.id));
    } else {
      await db
        .delete(subscriptionItems)
        .where(eq(subscriptionItems.id, candidate.item.id));
    }
    superseded += 1;
  }
  return superseded;
}
