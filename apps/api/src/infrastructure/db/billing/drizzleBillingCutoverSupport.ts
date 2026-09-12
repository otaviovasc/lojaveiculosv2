import { and, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { plans, subscriptionItems } from "@lojaveiculosv2/db";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

const cutoverVersion = "2026-08-v3";

export async function findCutoverFreePlan(db: DrizzleBillingClient) {
  const [freePlan] = await db
    .select()
    .from(plans)
    .where(
      and(
        eq(plans.catalogVersion, cutoverVersion),
        eq(plans.code, "free"),
        eq(plans.status, "active"),
      ),
    )
    .limit(1);
  if (!freePlan) throw new Error("The 2026-08-v3 Free plan is unavailable.");
  return freePlan;
}

export function findEffectiveCutoverPlanItems(
  db: DrizzleBillingClient,
  store: { id: string; tenantId: string },
  now: Date,
) {
  return db
    .select()
    .from(subscriptionItems)
    .where(
      and(
        eq(subscriptionItems.storeId, store.id),
        eq(subscriptionItems.tenantId, store.tenantId),
        eq(subscriptionItems.itemType, "plan"),
        or(
          isNull(subscriptionItems.startsAt),
          lte(subscriptionItems.startsAt, now),
        ),
        or(isNull(subscriptionItems.endsAt), gt(subscriptionItems.endsAt, now)),
      ),
    )
    .orderBy(desc(subscriptionItems.createdAt));
}
