import { and, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { subscriptionItems } from "@lojaveiculosv2/db";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export async function findCurrentEffectivePlanItem(
  db: DrizzleBillingClient,
  input: {
    now: Date;
    storeId: string;
    subscriptionId: string;
    tenantId: string;
  },
) {
  const [item] = await db
    .select({
      id: subscriptionItems.id,
      unitAmountCents: subscriptionItems.unitAmountCents,
    })
    .from(subscriptionItems)
    .where(
      and(
        eq(subscriptionItems.subscriptionId, input.subscriptionId),
        eq(subscriptionItems.storeId, input.storeId),
        eq(subscriptionItems.tenantId, input.tenantId),
        eq(subscriptionItems.itemType, "plan"),
        lte(subscriptionItems.startsAt, input.now),
        or(
          isNull(subscriptionItems.endsAt),
          gt(subscriptionItems.endsAt, input.now),
        ),
      ),
    )
    .orderBy(
      desc(subscriptionItems.startsAt),
      desc(subscriptionItems.createdAt),
      desc(subscriptionItems.id),
    )
    .limit(1);
  return item;
}

export function currentPlanItemGrantsPaidAccess(
  item: { unitAmountCents: number } | null | undefined,
) {
  return Boolean(item && item.unitAmountCents > 0);
}
