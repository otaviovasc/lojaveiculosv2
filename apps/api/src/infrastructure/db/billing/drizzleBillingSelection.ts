import { and, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import {
  addons,
  plans,
  stores,
  subscriptionItems,
  subscriptions,
} from "@lojaveiculosv2/db";
import type { UpdateBillingSelectionInput } from "../../../domains/billing/ports/billingRepository.js";
import { BillingSelectionError } from "../../../domains/billing/services/BillingService/updateBillingSelection.js";
import { ensureTenantBillingAccount } from "./drizzleBillingAccount.js";
import { toStorePlanContractItem } from "./drizzleBillingPlanContract.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { findActiveBillingCatalogVersion } from "./drizzleActiveBillingCatalog.js";

export async function updateStoreSubscriptionSelection(
  db: DrizzleBillingClient,
  input: UpdateBillingSelectionInput,
) {
  const now = new Date();
  const [existingSubscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.tenantId, input.tenantId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  const subscription =
    existingSubscription ??
    (await ensureTenantBillingAccount(db, input.tenantId)).subscription;
  const activeCatalogVersion = await findActiveBillingCatalogVersion(db);
  if (!activeCatalogVersion) {
    throw new BillingSelectionError("Billing catalog is unavailable.");
  }

  const [plan] = await db
    .select()
    .from(plans)
    .where(
      and(
        eq(plans.id, input.planId),
        eq(plans.catalogVersion, activeCatalogVersion),
        eq(plans.status, "active"),
        lte(plans.publishedAt, now),
      ),
    )
    .limit(1);
  if (!plan) throw new BillingSelectionError("Selected plan is unavailable.");
  const selectedAddons = input.addonIds.length
    ? await db
        .select()
        .from(addons)
        .where(
          and(
            inArray(addons.id, [...input.addonIds]),
            eq(addons.catalogVersion, activeCatalogVersion),
            eq(addons.status, "active"),
            lte(addons.publishedAt, now),
          ),
        )
    : [];
  if (
    selectedAddons.length !== input.addonIds.length ||
    selectedAddons.some((addon) => addon.catalogVersion !== plan.catalogVersion)
  ) {
    throw new BillingSelectionError("Selected add-on is unavailable.");
  }

  const activeItems = await db
    .select()
    .from(subscriptionItems)
    .where(
      and(
        eq(subscriptionItems.subscriptionId, subscription.id),
        eq(subscriptionItems.storeId, input.storeId),
        eq(subscriptionItems.tenantId, input.tenantId),
        or(
          isNull(subscriptionItems.startsAt),
          lte(subscriptionItems.startsAt, now),
        ),
        or(isNull(subscriptionItems.endsAt), gt(subscriptionItems.endsAt, now)),
      ),
    );
  const activeGlobalPlanItems = await db
    .select()
    .from(subscriptionItems)
    .where(
      and(
        eq(subscriptionItems.subscriptionId, subscription.id),
        eq(subscriptionItems.itemType, "plan"),
        isNull(subscriptionItems.storeId),
        eq(subscriptionItems.tenantId, input.tenantId),
        or(
          isNull(subscriptionItems.startsAt),
          lte(subscriptionItems.startsAt, now),
        ),
        or(isNull(subscriptionItems.endsAt), gt(subscriptionItems.endsAt, now)),
      ),
    );
  const activeStores = await db
    .select({ id: stores.id })
    .from(stores)
    .where(
      and(
        eq(stores.tenantId, input.tenantId),
        eq(stores.isDeleted, false),
        isNull(stores.deletedAt),
      ),
    );
  const resetDraft =
    subscription.status === "trialing" || subscription.status === "expired";
  if (activeGlobalPlanItems.length > 1) {
    throw new BillingSelectionError(
      "This billing account has multiple unallocated plans and needs billing repair.",
    );
  }
  const globalPlanItem = activeGlobalPlanItems[0];
  const canPromoteGlobalPlan =
    globalPlanItem &&
    activeStores.length === 1 &&
    activeStores[0]?.id === input.storeId;
  if (globalPlanItem && !canPromoteGlobalPlan) {
    throw new BillingSelectionError(
      "This billing account needs store allocation before the plan can be changed.",
    );
  }
  const globalPlanMatchesSelection =
    canPromoteGlobalPlan && globalPlanItem.planId === plan.id;
  if (canPromoteGlobalPlan && globalPlanMatchesSelection) {
    await db
      .update(subscriptionItems)
      .set({ storeId: input.storeId, updatedAt: now })
      .where(eq(subscriptionItems.id, globalPlanItem.id));
  } else if (canPromoteGlobalPlan) {
    await db
      .update(subscriptionItems)
      .set({ endsAt: now, updatedAt: now })
      .where(eq(subscriptionItems.id, globalPlanItem.id));
  }
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
    !globalPlanMatchesSelection &&
    !retainedItems.some(
      (item) => item.itemType === "plan" && item.planId === plan.id,
    )
  ) {
    await db.insert(subscriptionItems).values(
      toStorePlanContractItem({
        plan,
        startsAt: now,
        storeId: input.storeId,
        subscription,
        tenantId: input.tenantId,
      }),
    );
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
