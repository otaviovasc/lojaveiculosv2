import { and, eq, isNull, sql } from "drizzle-orm";
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
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
export { fallbackExpiredPastDueSubscriptions } from "./drizzleBillingFreeFallback.js";

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
      const account = await ensureTenantBillingAccount(
        txDb,
        store.tenantId,
        store.id,
      );
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
