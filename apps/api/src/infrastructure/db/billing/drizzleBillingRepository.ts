import { and, desc, eq, isNull, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  planFeatures,
  plans,
  storeEntitlements,
  subscriptionItems,
  subscriptions,
} from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type {
  BillingOverview,
  BillingPlan,
  BillingRepository,
  BillingSubscription,
  StoreEntitlement,
} from "../../../domains/billing/ports/billingRepository.js";

export type DrizzleBillingClient = PostgresJsDatabase<typeof schema>;

export function createDrizzleBillingRepository(
  db: DrizzleBillingClient,
): BillingRepository {
  return {
    async getOverview(input) {
      return getOverview(db, input);
    },
    async updateStoreEntitlement(input) {
      await db
        .insert(storeEntitlements)
        .values({
          endsAt: input.endsAt ?? null,
          featureKey: input.featureKey,
          metadata: input.metadata ?? {},
          source: input.source,
          startsAt: input.startsAt ?? null,
          status: input.status,
          storeId: input.storeId,
          tenantId: input.tenantId,
        })
        .onConflictDoUpdate({
          set: {
            endsAt: input.endsAt ?? null,
            metadata: input.metadata ?? {},
            source: input.source,
            startsAt: input.startsAt ?? null,
            status: input.status,
          },
          target: [storeEntitlements.storeId, storeEntitlements.featureKey],
        });

      return getOverview(db, input);
    },
  };
}

async function getOverview(
  db: DrizzleBillingClient,
  input: { storeId: string; tenantId: string },
): Promise<BillingOverview> {
  const [billingPlans, entitlements, subscription] = await Promise.all([
    listPlans(db),
    listEntitlements(db, input),
    findSubscription(db, input),
  ]);

  return {
    entitlements,
    plans: billingPlans,
    storeId: input.storeId as never,
    subscription,
    tenantId: input.tenantId as never,
  };
}

async function listPlans(db: DrizzleBillingClient): Promise<BillingPlan[]> {
  const [planRows, featureRows] = await Promise.all([
    db.select().from(plans).orderBy(plans.monthlyPriceCents).limit(50),
    db.select().from(planFeatures).limit(500),
  ]);

  return planRows.map((plan) => ({
    code: plan.code,
    features: featureRows
      .filter((feature) => feature.planId === plan.id)
      .map((feature) => ({
        featureKey: feature.featureKey as never,
        included: feature.included === 1,
        limitValue: feature.limitValue,
      })),
    id: plan.id,
    monthlyPriceCents: plan.monthlyPriceCents,
    name: plan.name,
    status: plan.status,
  }));
}

async function listEntitlements(
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

async function findSubscription(
  db: DrizzleBillingClient,
  input: { storeId: string; tenantId: string },
): Promise<BillingSubscription | null> {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.tenantId, input.tenantId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  if (!subscription) return null;

  const [item] = await db
    .select()
    .from(subscriptionItems)
    .where(
      and(
        eq(subscriptionItems.subscriptionId, subscription.id),
        eq(subscriptionItems.itemType, "plan"),
        or(
          eq(subscriptionItems.storeId, input.storeId),
          isNull(subscriptionItems.storeId),
        ),
      ),
    )
    .orderBy(desc(subscriptionItems.createdAt))
    .limit(1);
  const plan = item?.planId ? await findPlan(db, item.planId) : null;

  return {
    currentPeriodEnd: subscription.currentPeriodEnd,
    currentPeriodStart: subscription.currentPeriodStart,
    id: subscription.id,
    plan,
    status: subscription.status,
  };
}

async function findPlan(
  db: DrizzleBillingClient,
  planId: string,
): Promise<BillingPlan | null> {
  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, planId))
    .limit(1);
  if (!plan) return null;

  const features = await db
    .select()
    .from(planFeatures)
    .where(eq(planFeatures.planId, planId))
    .limit(100);

  return {
    code: plan.code,
    features: features.map((feature) => ({
      featureKey: feature.featureKey as never,
      included: feature.included === 1,
      limitValue: feature.limitValue,
    })),
    id: plan.id,
    monthlyPriceCents: plan.monthlyPriceCents,
    name: plan.name,
    status: plan.status,
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
