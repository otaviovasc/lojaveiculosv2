import { and, desc, eq } from "drizzle-orm";
import { subscriptions } from "@lojaveiculosv2/db";
import type { BillingSubscription } from "../../../domains/billing/ports/billingRepository.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export async function findTenantSubscription(
  db: DrizzleBillingClient,
  input: { storeId: string; tenantId: string },
  now: Date = new Date(),
): Promise<BillingSubscription | null> {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.tenantId, input.tenantId),
        eq(subscriptions.storeId, input.storeId),
      ),
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  return subscription ? toBillingSubscription(subscription, now) : null;
}

export async function listTenantStoreSubscriptions(
  db: DrizzleBillingClient,
  input: { tenantId: string },
  now: Date = new Date(),
) {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.tenantId, input.tenantId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(500);
  const latestByStore = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latestByStore.has(row.storeId)) latestByStore.set(row.storeId, row);
  }
  return [...latestByStore.values()].map((row) => ({
    storeId: row.storeId,
    subscription: toBillingSubscription(row, now),
  }));
}

function toBillingSubscription(
  subscription: typeof subscriptions.$inferSelect,
  now: Date,
): BillingSubscription {
  const status =
    subscription.status === "trialing" &&
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd <= now
      ? "expired"
      : subscription.status;
  return {
    currentPeriodEnd: subscription.currentPeriodEnd,
    currentPeriodStart: subscription.currentPeriodStart,
    id: subscription.id,
    plan: null,
    status,
  };
}
