import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import { subscriptionItems, subscriptions } from "@lojaveiculosv2/db";
import { findCutoverFreePlan } from "./drizzleBillingCutoverSupport.js";
import { enqueueFreeFallbackReconciliation } from "./drizzleBillingFallbackReconciliation.js";
import { finalizeScheduledFreeDowngrades } from "./drizzleBillingFreeTransitions.js";
import { lockEffectivePlanContract } from "./drizzleBillingContractLock.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { finalizeScheduledPaidPlanActivations } from "./drizzleBillingScheduledPaidActivation.js";
import { fallbackStoreToFree } from "./drizzleBillingFreeFallbackStore.js";

export async function fallbackExpiredPastDueSubscriptions(
  db: DrizzleBillingClient,
  now: Date = new Date(),
): Promise<number> {
  await finalizeScheduledPaidPlanActivations(db, now);
  await finalizeScheduledFreeDowngrades(db, now);
  const freePlan = await findCutoverFreePlan(db);
  const expired = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "past_due"),
        lte(subscriptions.currentPeriodEnd, now),
      ),
    )
    .limit(1_000);
  let converted = 0;
  for (const subscription of expired) {
    converted += await fallbackExpiredSubscription(
      db,
      subscription,
      freePlan.id,
      now,
    );
  }
  await finalizeScheduledFreeDowngrades(db, now);
  await finalizeScheduledPaidPlanActivations(db, now);
  return converted;
}

async function fallbackExpiredSubscription(
  db: DrizzleBillingClient,
  subscription: typeof subscriptions.$inferSelect,
  freePlanId: string,
  now: Date,
) {
  return db.transaction(async (tx) => {
    const txDb = tx as DrizzleBillingClient;
    const affectedStores = fallbackStoreIds(
      subscription.storeId,
      await findAffectedStores(txDb, subscription.id, now),
    );
    for (const storeId of affectedStores) {
      await lockEffectivePlanContract(txDb, subscription.tenantId, storeId);
    }
    const [transitionedSubscription] = await txDb
      .update(subscriptions)
      .set({
        currentPeriodEnd: null,
        currentPeriodStart: now,
        status: "active",
        updatedAt: now,
      })
      .where(
        and(
          eq(subscriptions.id, subscription.id),
          eq(subscriptions.tenantId, subscription.tenantId),
          eq(subscriptions.status, "past_due"),
          lte(subscriptions.currentPeriodEnd, now),
        ),
      )
      .returning({ id: subscriptions.id });
    if (!transitionedSubscription) return 0;
    for (const storeId of affectedStores) {
      await fallbackStoreToFree(txDb, subscription, storeId, freePlanId, now);
    }
    await enqueueFreeFallbackReconciliation(txDb, subscription, now);
    return affectedStores.length;
  });
}

export function fallbackStoreIds(
  subscriptionStoreId: string,
  effectiveStoreIds: readonly string[],
) {
  return Array.from(
    new Set([subscriptionStoreId, ...effectiveStoreIds]),
  ).sort();
}

async function findAffectedStores(
  db: DrizzleBillingClient,
  subscriptionId: string,
  now: Date,
) {
  const rows = await db
    .selectDistinct({ storeId: subscriptionItems.storeId })
    .from(subscriptionItems)
    .where(
      and(
        eq(subscriptionItems.subscriptionId, subscriptionId),
        eq(subscriptionItems.itemType, "plan"),
        or(
          isNull(subscriptionItems.startsAt),
          lte(subscriptionItems.startsAt, now),
        ),
        or(isNull(subscriptionItems.endsAt), gt(subscriptionItems.endsAt, now)),
      ),
    );
  return rows.map((row) => row.storeId).sort();
}
