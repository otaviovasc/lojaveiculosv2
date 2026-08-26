import { and, eq, lte, sql } from "drizzle-orm";
import {
  billingPlanHires,
  billingPlanHireTransitions,
  subscriptionItems,
  subscriptions,
} from "@lojaveiculosv2/db";
import { projectSelectedEntitlements } from "./drizzleBillingEntitlementProjection.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { recordBillingProductEvent } from "./drizzleBillingProductEvents.js";

export async function finalizeScheduledFreeDowngrades(
  db: DrizzleBillingClient,
  now: Date = new Date(),
): Promise<number> {
  const due = await db
    .select({ hire: billingPlanHires, startsAt: subscriptionItems.startsAt })
    .from(billingPlanHires)
    .innerJoin(
      subscriptionItems,
      eq(subscriptionItems.id, billingPlanHires.effectiveSubscriptionItemId),
    )
    .where(
      and(
        eq(billingPlanHires.status, "downgrade_scheduled"),
        eq(subscriptionItems.itemType, "plan"),
        eq(subscriptionItems.unitAmountCents, 0),
        lte(subscriptionItems.startsAt, now),
      ),
    )
    .limit(1_000);
  let finalized = 0;
  for (const candidate of due) {
    await db.transaction(async (tx) => {
      const txDb = tx as DrizzleBillingClient;
      await txDb.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${candidate.hire.tenantId}:${candidate.hire.storeId}:plan-activation`}, 31))`,
      );
      const [hire] = await txDb
        .select()
        .from(billingPlanHires)
        .where(
          and(
            eq(billingPlanHires.id, candidate.hire.id),
            eq(billingPlanHires.status, "downgrade_scheduled"),
          ),
        )
        .limit(1);
      if (!hire) return;
      await txDb
        .update(subscriptions)
        .set({
          currentPeriodEnd: null,
          currentPeriodStart: candidate.startsAt ?? now,
          status: "active",
          updatedAt: now,
        })
        .where(
          and(
            eq(subscriptions.id, hire.subscriptionId),
            eq(subscriptions.tenantId, hire.tenantId),
          ),
        );
      await txDb
        .update(billingPlanHires)
        .set({
          activatedAt: now,
          completedAt: now,
          failureCode: null,
          status: "paid_active",
          updatedAt: now,
        })
        .where(eq(billingPlanHires.id, hire.id));
      await txDb.insert(billingPlanHireTransitions).values({
        fromStatus: "downgrade_scheduled",
        hireId: hire.id,
        metadata: {},
        storeId: hire.storeId,
        tenantId: hire.tenantId,
        toStatus: "paid_active",
      });
      await projectSelectedEntitlements(txDb, {
        source: "billing_plan_hire",
        storeId: hire.storeId,
        subscriptionId: hire.subscriptionId,
        tenantId: hire.tenantId,
      });
      await recordBillingProductEvent(txDb, {
        eventName: "free_fallback",
        hireId: hire.id,
        idempotencyKey: `billing-free-downgrade:${hire.id}:activated`,
        properties: { reason: "voluntary_downgrade" },
        storeId: hire.storeId,
        tenantId: hire.tenantId,
      });
      finalized += 1;
    });
  }
  return finalized;
}
