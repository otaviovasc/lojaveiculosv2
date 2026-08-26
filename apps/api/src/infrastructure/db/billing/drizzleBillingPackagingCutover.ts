import { and, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";
import {
  billingPackagingCutovers,
  stores,
  subscriptionItems,
  subscriptions,
} from "@lojaveiculosv2/db";
import { ensureTenantBillingAccount } from "./drizzleBillingAccount.js";
import {
  findCutoverFreePlan,
  findEffectiveCutoverPlanItems,
} from "./drizzleBillingCutoverSupport.js";
import { projectSelectedEntitlements } from "./drizzleBillingEntitlementProjection.js";
import { finalizeScheduledFreeDowngrades } from "./drizzleBillingFreeTransitions.js";
import { finalizeScheduledPaidPlanActivations } from "./drizzleBillingScheduledPaidActivation.js";
import { recordBillingProductEvent } from "./drizzleBillingProductEvents.js";
import { enqueueFreeFallbackReconciliation } from "./drizzleBillingFallbackReconciliation.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export { finalizeScheduledFreeDowngrades } from "./drizzleBillingFreeTransitions.js";

const cutoverVersion = "2026-08-v3";

export async function runBillingPackagingCutover(
  db: DrizzleBillingClient,
): Promise<{ convertedStores: number; status: "completed" | "skipped" }> {
  return db.transaction(async (tx) => {
    const txDb = tx as DrizzleBillingClient;
    await txDb.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`billing-packaging:${cutoverVersion}`}, 31))`,
    );
    const [existing] = await txDb
      .select()
      .from(billingPackagingCutovers)
      .where(eq(billingPackagingCutovers.version, cutoverVersion))
      .limit(1);
    if (existing?.status === "completed") {
      return { convertedStores: 0, status: "skipped" as const };
    }
    if (existing) {
      await txDb
        .update(billingPackagingCutovers)
        .set({ failureCode: null, status: "running", updatedAt: new Date() })
        .where(eq(billingPackagingCutovers.id, existing.id));
    } else {
      await txDb.insert(billingPackagingCutovers).values({
        status: "running",
        version: cutoverVersion,
      });
    }

    const freePlan = await findCutoverFreePlan(txDb);
    const storeRows = await txDb
      .select({ id: stores.id, tenantId: stores.tenantId })
      .from(stores)
      .where(and(eq(stores.isDeleted, false), isNull(stores.deletedAt)))
      .limit(10_000);
    const now = new Date();
    for (const store of storeRows) {
      await txDb.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${store.tenantId}:${store.id}:billing-cutover`}, 31))`,
      );
      const account = await ensureTenantBillingAccount(txDb, store.tenantId);
      const effectiveItems = await findEffectiveCutoverPlanItems(
        txDb,
        store,
        now,
      );
      const existingFree = effectiveItems.find(
        (item) => item.planId === freePlan.id,
      );
      for (const item of effectiveItems) {
        if (item.id === existingFree?.id) continue;
        await txDb
          .update(subscriptionItems)
          .set({ endsAt: now, updatedAt: now })
          .where(eq(subscriptionItems.id, item.id));
      }
      if (!existingFree) {
        await txDb.insert(subscriptionItems).values({
          itemType: "plan",
          planId: freePlan.id,
          quantity: 1,
          startsAt: now,
          storeId: store.id,
          subscriptionId: account.subscription.id,
          tenantId: store.tenantId,
          unitAmountCents: 0,
        });
      }
      await txDb
        .update(subscriptions)
        .set({
          currentPeriodEnd: null,
          currentPeriodStart: now,
          status: "active",
          updatedAt: now,
        })
        .where(eq(subscriptions.id, account.subscription.id));
      await projectSelectedEntitlements(txDb, {
        source: "billing_plan_hire",
        storeId: store.id,
        subscriptionId: account.subscription.id,
        tenantId: store.tenantId,
      });
    }
    await txDb
      .update(billingPackagingCutovers)
      .set({ completedAt: now, status: "completed", updatedAt: now })
      .where(eq(billingPackagingCutovers.version, cutoverVersion));
    return { convertedStores: storeRows.length, status: "completed" as const };
  });
}

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
    await db.transaction(async (tx) => {
      const txDb = tx as DrizzleBillingClient;
      await txDb.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${subscription.tenantId}:${subscription.id}:free-fallback`}, 31))`,
      );
      const [stillExpired] = await txDb
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.id, subscription.id),
            eq(subscriptions.status, "past_due"),
            lte(subscriptions.currentPeriodEnd, now),
          ),
        )
        .limit(1);
      if (!stillExpired) return;
      const affectedStores = await txDb
        .selectDistinct({ storeId: subscriptionItems.storeId })
        .from(subscriptionItems)
        .where(
          and(
            eq(subscriptionItems.subscriptionId, subscription.id),
            eq(subscriptionItems.itemType, "plan"),
            or(
              isNull(subscriptionItems.startsAt),
              lte(subscriptionItems.startsAt, now),
            ),
            or(
              isNull(subscriptionItems.endsAt),
              gt(subscriptionItems.endsAt, now),
            ),
          ),
        );
      await txDb
        .update(subscriptions)
        .set({
          currentPeriodEnd: null,
          currentPeriodStart: now,
          status: "active",
          updatedAt: now,
        })
        .where(eq(subscriptions.id, subscription.id));
      for (const row of affectedStores) {
        if (!row.storeId) continue;
        const [scheduledFree] = await txDb
          .select({ id: subscriptionItems.id })
          .from(subscriptionItems)
          .where(
            and(
              eq(subscriptionItems.subscriptionId, subscription.id),
              eq(subscriptionItems.storeId, row.storeId),
              eq(subscriptionItems.itemType, "plan"),
              eq(subscriptionItems.planId, freePlan.id),
              eq(subscriptionItems.unitAmountCents, 0),
              isNull(subscriptionItems.endsAt),
            ),
          )
          .limit(1);
        await txDb
          .update(subscriptionItems)
          .set({ endsAt: now, updatedAt: now })
          .where(
            and(
              eq(subscriptionItems.subscriptionId, subscription.id),
              eq(subscriptionItems.storeId, row.storeId!),
              eq(subscriptionItems.itemType, "plan"),
              or(
                isNull(subscriptionItems.startsAt),
                lte(subscriptionItems.startsAt, now),
              ),
              or(
                isNull(subscriptionItems.endsAt),
                gt(subscriptionItems.endsAt, now),
              ),
            ),
          );
        if (scheduledFree) {
          await txDb
            .update(subscriptionItems)
            .set({ startsAt: now, updatedAt: now })
            .where(eq(subscriptionItems.id, scheduledFree.id));
        } else {
          await txDb.insert(subscriptionItems).values({
            itemType: "plan",
            planId: freePlan.id,
            quantity: 1,
            startsAt: now,
            storeId: row.storeId,
            subscriptionId: subscription.id,
            tenantId: subscription.tenantId,
            unitAmountCents: 0,
          });
        }
        await projectSelectedEntitlements(txDb, {
          source: "billing_plan_hire",
          storeId: row.storeId!,
          subscriptionId: subscription.id,
          tenantId: subscription.tenantId,
        });
        await recordBillingProductEvent(txDb, {
          eventName: "free_fallback",
          idempotencyKey: `billing-free-fallback:${subscription.id}:${row.storeId}:${now.toISOString()}`,
          properties: { reason: "grace_expired" },
          storeId: row.storeId,
          tenantId: subscription.tenantId,
        });
        converted += 1;
      }
      await enqueueFreeFallbackReconciliation(txDb, subscription, now);
    });
  }
  await finalizeScheduledFreeDowngrades(db, now);
  await finalizeScheduledPaidPlanActivations(db, now);
  return converted;
}
