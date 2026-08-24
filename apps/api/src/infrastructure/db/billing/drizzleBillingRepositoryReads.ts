import { and, desc, eq } from "drizzle-orm";
import { storeEntitlements, subscriptionItems } from "@lojaveiculosv2/db";
import type {
  BillingSubscription,
  StoreEntitlement,
} from "../../../domains/billing/ports/billingRepository.js";
import {
  findPlan,
  findTenantSubscription,
} from "./drizzleBillingCatalogSupport.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export async function listEntitlements(
  db: DrizzleBillingClient,
  input: { storeId: string; tenantId: string },
): Promise<StoreEntitlement[]> {
  const rows = await db
    .select()
    .from(storeEntitlements)
    .where(
      and(
        eq(storeEntitlements.storeId, input.storeId),
        eq(storeEntitlements.tenantId, input.tenantId),
      ),
    )
    .limit(100);

  return rows.map((row) => ({
    endsAt: row.endsAt,
    featureKey: row.featureKey as never,
    metadata: toRecord(row.metadata),
    source: row.source,
    startsAt: row.startsAt,
    status: row.status,
  }));
}

export async function findSubscription(
  db: DrizzleBillingClient,
  input: { storeId: string; tenantId: string },
): Promise<BillingSubscription | null> {
  const subscription = await findTenantSubscription(db, input);
  if (!subscription) return null;

  const [item] = await db
    .select()
    .from(subscriptionItems)
    .where(
      and(
        eq(subscriptionItems.subscriptionId, subscription.id),
        eq(subscriptionItems.itemType, "plan"),
        eq(subscriptionItems.storeId, input.storeId),
        eq(subscriptionItems.tenantId, input.tenantId),
      ),
    )
    .orderBy(desc(subscriptionItems.createdAt))
    .limit(1);
  const plan = item?.planId ? await findPlan(db, item.planId) : null;

  return { ...subscription, plan };
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
