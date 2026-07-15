import { and, desc, eq, inArray, isNull, or, gt } from "drizzle-orm";
import {
  addons,
  plans,
  subscriptionItems,
  subscriptions,
} from "@lojaveiculosv2/db";
import type { UpdateBillingSelectionInput } from "../../../domains/billing/ports/billingRepository.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export async function updateStoreSubscriptionSelection(
  db: DrizzleBillingClient,
  input: UpdateBillingSelectionInput,
) {
  const now = new Date();
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.tenantId, input.tenantId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  if (!subscription) throw new Error("Billing subscription was not found.");

  const [plan] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.id, input.planId), eq(plans.status, "active")))
    .limit(1);
  if (!plan) throw new Error("Selected billing plan was not found.");
  const selectedAddons = input.addonIds.length
    ? await db
        .select()
        .from(addons)
        .where(inArray(addons.id, [...input.addonIds]))
    : [];
  if (
    selectedAddons.length !== input.addonIds.length ||
    selectedAddons.some(
      (addon) =>
        addon.status !== "active" ||
        addon.catalogVersion !== plan.catalogVersion,
    )
  ) {
    throw new Error("Selected billing add-on was not found.");
  }

  const activeItems = await db
    .select()
    .from(subscriptionItems)
    .where(
      and(
        eq(subscriptionItems.subscriptionId, subscription.id),
        eq(subscriptionItems.storeId, input.storeId),
        or(isNull(subscriptionItems.endsAt), gt(subscriptionItems.endsAt, now)),
      ),
    );
  const resetDraft =
    subscription.status === "trialing" || subscription.status === "expired";
  if (resetDraft && activeItems.length) {
    await db
      .delete(subscriptionItems)
      .where(
        and(
          eq(subscriptionItems.subscriptionId, subscription.id),
          eq(subscriptionItems.storeId, input.storeId),
        ),
      );
  } else if (!resetDraft) {
    const selectedAddonIds = new Set(input.addonIds);
    const obsoleteIds = activeItems
      .filter(
        (item) =>
          (item.itemType === "plan" && item.planId !== plan.id) ||
          (item.itemType === "addon" &&
            (!item.addonId || !selectedAddonIds.has(item.addonId))),
      )
      .map((item) => item.id);
    if (obsoleteIds.length) {
      await db
        .update(subscriptionItems)
        .set({ endsAt: now, updatedAt: now })
        .where(inArray(subscriptionItems.id, obsoleteIds));
    }
  }

  const retainedItems = resetDraft ? [] : activeItems;
  if (
    !retainedItems.some(
      (item) => item.itemType === "plan" && item.planId === plan.id,
    )
  ) {
    await db.insert(subscriptionItems).values({
      itemType: "plan",
      planId: plan.id,
      quantity: 1,
      startsAt: now,
      storeId: input.storeId,
      subscriptionId: subscription.id,
      tenantId: input.tenantId,
      unitAmountCents: plan.monthlyPriceCents,
    });
  }
  for (const addon of selectedAddons) {
    if (
      retainedItems.some(
        (item) => item.itemType === "addon" && item.addonId === addon.id,
      )
    )
      continue;
    await db.insert(subscriptionItems).values({
      addonId: addon.id,
      itemType: "addon",
      quantity: 1,
      startsAt: now,
      storeId: input.storeId,
      subscriptionId: subscription.id,
      tenantId: input.tenantId,
      unitAmountCents: addon.monthlyPriceCents,
    });
  }
}
