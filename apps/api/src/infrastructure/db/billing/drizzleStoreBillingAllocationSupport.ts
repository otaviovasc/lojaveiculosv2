import { eq } from "drizzle-orm";
import { storeEntitlements } from "@lojaveiculosv2/db";
import type {
  BillingPlan,
  BillingSubscription,
} from "../../../domains/billing/ports/billingRepository.js";
import { isEffectiveEntitlement } from "../../../domains/billing/readModels/billingOverviewModel.js";
import { listChargeables } from "./drizzleBillingOverviewSupport.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { listActiveBillingStores } from "./drizzleBillingStoreDirectory.js";

export async function listStoreScopedAllocations(
  db: DrizzleBillingClient,
  input: { storeId: string; tenantId: string },
  billingPlans: readonly BillingPlan[],
  subscription: BillingSubscription | null,
) {
  const [storeRows, chargeables, entitlementRows] = await Promise.all([
    listActiveBillingStores(db, input.tenantId),
    listChargeables(db, input, billingPlans, subscription),
    db
      .select()
      .from(storeEntitlements)
      .where(eq(storeEntitlements.tenantId, input.tenantId))
      .limit(500),
  ]);

  return storeRows.map((store) => {
    const items = chargeables.filter(
      (item) =>
        item.storeId === store.id ||
        (!item.storeId && store.id === input.storeId),
    );
    const planItem = items.find((item) => item.itemType === "plan");
    const plan = billingPlans.find((item) => item.id === planItem?.sourceId);
    const entitlements = entitlementRows.filter(
      (row) => row.storeId === store.id,
    );

    return {
      activeEntitlementCount: entitlements.filter((item) =>
        isEffectiveEntitlement(item),
      ).length,
      addonCount: items.filter((item) => item.itemType === "addon").length,
      monthlyAmountCents: items.reduce(
        (sum, item) => sum + item.fullAmountCents,
        0,
      ),
      planCode: plan?.code ?? null,
      planName: planItem?.label ?? null,
      storeId: store.id as never,
      storeName: store.tradingName,
      storeSlug: store.publicSlug,
      subscriptionStatus: subscription?.status ?? null,
    };
  });
}
