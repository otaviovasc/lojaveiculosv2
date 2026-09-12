import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import { subscriptionItems } from "@lojaveiculosv2/db";
import { supersedeScheduledFreePlanContracts } from "./drizzleBillingPlanHireContracts.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export async function endActivePlanItems(
  db: DrizzleBillingClient,
  storeId: string,
  tenantId: string,
  now: Date,
) {
  await supersedeScheduledFreePlanContracts(db, {
    replacementAt: now,
    storeId,
    supersedingHireId: "paid-contract-activation",
    tenantId,
  });
  const activeItems = await db
    .select()
    .from(subscriptionItems)
    .where(
      and(
        eq(subscriptionItems.itemType, "plan"),
        eq(subscriptionItems.storeId, storeId),
        eq(subscriptionItems.tenantId, tenantId),
        or(
          isNull(subscriptionItems.startsAt),
          lte(subscriptionItems.startsAt, now),
        ),
        or(isNull(subscriptionItems.endsAt), gt(subscriptionItems.endsAt, now)),
      ),
    );
  for (const item of activeItems) {
    await db
      .update(subscriptionItems)
      .set({ endsAt: now, updatedAt: now })
      .where(
        and(
          eq(subscriptionItems.id, item.id),
          eq(subscriptionItems.subscriptionId, item.subscriptionId),
          eq(subscriptionItems.storeId, storeId),
          eq(subscriptionItems.tenantId, tenantId),
        ),
      );
  }
}
