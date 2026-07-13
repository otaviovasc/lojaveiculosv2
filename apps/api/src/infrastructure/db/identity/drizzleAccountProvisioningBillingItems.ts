import { and, eq } from "drizzle-orm";
import { subscriptionItems } from "@lojaveiculosv2/db";
import type { DrizzleAccountProvisioningClient } from "./drizzleAccountProvisioningSupport.js";

type StoreSubscriptionItemInput = {
  storeId: string;
  subscriptionId: string;
  tenantId: string;
  unitAmountCents: number;
};

export async function ensureStorePlanItem(
  db: DrizzleAccountProvisioningClient,
  input: StoreSubscriptionItemInput & { planId: string },
) {
  const [existing] = await db
    .select()
    .from(subscriptionItems)
    .where(
      and(
        eq(subscriptionItems.subscriptionId, input.subscriptionId),
        eq(subscriptionItems.itemType, "plan"),
        eq(subscriptionItems.storeId, input.storeId),
      ),
    )
    .limit(1);
  if (existing) {
    await db
      .update(subscriptionItems)
      .set({
        endsAt: null,
        planId: input.planId,
        quantity: 1,
        startsAt: new Date(),
        unitAmountCents: input.unitAmountCents,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionItems.id, existing.id));
    return;
  }

  await db.insert(subscriptionItems).values({
    itemType: "plan",
    planId: input.planId,
    quantity: 1,
    startsAt: new Date(),
    storeId: input.storeId,
    subscriptionId: input.subscriptionId,
    tenantId: input.tenantId,
    unitAmountCents: input.unitAmountCents,
  });
}

export async function ensureStoreAddonItem(
  db: DrizzleAccountProvisioningClient,
  input: StoreSubscriptionItemInput & { addonId: string },
) {
  const [existing] = await db
    .select()
    .from(subscriptionItems)
    .where(
      and(
        eq(subscriptionItems.subscriptionId, input.subscriptionId),
        eq(subscriptionItems.itemType, "addon"),
        eq(subscriptionItems.addonId, input.addonId),
        eq(subscriptionItems.storeId, input.storeId),
      ),
    )
    .limit(1);
  if (existing) return;

  await db.insert(subscriptionItems).values({
    addonId: input.addonId,
    itemType: "addon",
    quantity: 1,
    startsAt: new Date(),
    storeId: input.storeId,
    subscriptionId: input.subscriptionId,
    tenantId: input.tenantId,
    unitAmountCents: input.unitAmountCents,
  });
}
