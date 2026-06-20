import { and, desc, eq } from "drizzle-orm";
import {
  payments,
  storeEntitlements,
  storeEntitlementEvents,
  stores,
  subscriptionItems,
} from "@lojaveiculosv2/db";
import type {
  BillingEntitlementEvent,
  BillingFinancialSummary,
  BillingPlan,
  BillingStoreAllocation,
  BillingSubscription,
} from "../../../domains/billing/ports/billingRepository.js";
import { isUsableEntitlement } from "../../../domains/billing/readModels/billingOverviewModel.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export async function listEntitlementEvents(
  db: DrizzleBillingClient,
  input: { storeId: string; tenantId: string },
): Promise<BillingEntitlementEvent[]> {
  const rows = await db
    .select()
    .from(storeEntitlementEvents)
    .where(
      and(
        eq(storeEntitlementEvents.storeId, input.storeId),
        eq(storeEntitlementEvents.tenantId, input.tenantId),
      ),
    )
    .orderBy(desc(storeEntitlementEvents.createdAt))
    .limit(25);

  return rows.map((row) => ({
    actorId: row.actorId,
    createdAt: row.createdAt,
    featureKey: row.featureKey as never,
    id: row.id,
    metadata: toRecord(row.metadata),
    nextStatus: row.nextStatus,
    previousStatus: row.previousStatus,
    reason: row.reason,
    source: row.source,
  }));
}

export async function listAllocations(
  db: DrizzleBillingClient,
  input: { storeId: string; tenantId: string },
  billingPlans: readonly BillingPlan[],
  subscription: BillingSubscription | null,
): Promise<BillingStoreAllocation[]> {
  const [storeRows, itemRows, entitlementRows] = await Promise.all([
    db
      .select()
      .from(stores)
      .where(eq(stores.tenantId, input.tenantId))
      .limit(50),
    subscription ? listSubscriptionItems(db, subscription.id) : [],
    db
      .select()
      .from(storeEntitlements)
      .where(eq(storeEntitlements.tenantId, input.tenantId))
      .limit(500),
  ]);
  const globalPlanItem = itemRows.find(isGlobalPlanItem);

  return storeRows.map((store) => {
    const items = itemRows.filter(
      (item) =>
        item.storeId === store.id ||
        (!item.storeId && store.id === input.storeId),
    );
    const planItem =
      items.find((item) => item.itemType === "plan") ?? globalPlanItem;
    const plan = billingPlans.find((item) => item.id === planItem?.planId);
    const entitlements = entitlementRows.filter(
      (row) => row.storeId === store.id,
    );

    return {
      activeEntitlementCount: entitlements.filter((item) =>
        isUsableEntitlement(item.status),
      ).length,
      addonCount: items.filter((item) => item.itemType === "addon").length,
      monthlyAmountCents: items.reduce(
        (sum, item) => sum + item.unitAmountCents * item.quantity,
        0,
      ),
      planCode: plan?.code ?? null,
      planName: plan?.name ?? null,
      storeId: store.id as never,
      storeName: store.tradingName,
      subscriptionStatus: subscription?.status ?? null,
    };
  });
}

export async function getFinancialSummary(
  db: DrizzleBillingClient,
  input: { tenantId: string },
  subscription: BillingSubscription | null,
): Promise<BillingFinancialSummary> {
  const [itemRows, paymentRows] = await Promise.all([
    subscription ? listSubscriptionItems(db, subscription.id) : [],
    db
      .select()
      .from(payments)
      .where(eq(payments.tenantId, input.tenantId))
      .orderBy(desc(payments.createdAt))
      .limit(100),
  ]);

  return {
    monthlyRecurringCents: itemRows.reduce(
      (sum, item) => sum + item.unitAmountCents * item.quantity,
      0,
    ),
    nextDueAt:
      paymentRows.find((payment) => payment.status === "pending")?.dueAt ??
      null,
    openInvoiceCount: paymentRows.filter(
      (payment) => payment.status === "pending",
    ).length,
    overdueInvoiceCount: paymentRows.filter(
      (payment) => payment.status === "overdue",
    ).length,
    paidThisPeriodCents: paymentRows
      .filter((payment) => payment.status === "paid")
      .reduce((sum, payment) => sum + payment.amountCents, 0),
  };
}

function listSubscriptionItems(
  db: DrizzleBillingClient,
  subscriptionId: string,
) {
  return db
    .select()
    .from(subscriptionItems)
    .where(eq(subscriptionItems.subscriptionId, subscriptionId))
    .limit(200);
}

function isGlobalPlanItem(item: { itemType: string; storeId: string | null }) {
  return item.itemType === "plan" && !item.storeId;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
