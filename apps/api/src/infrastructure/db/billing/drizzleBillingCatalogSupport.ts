import { desc, eq } from "drizzle-orm";
import { planFeatures, plans, subscriptions } from "@lojaveiculosv2/db";
import type {
  BillingPlan,
  BillingSubscription,
} from "../../../domains/billing/ports/billingRepository.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export async function listPlans(
  db: DrizzleBillingClient,
): Promise<BillingPlan[]> {
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

export async function findTenantSubscription(
  db: DrizzleBillingClient,
  input: { tenantId: string },
): Promise<BillingSubscription | null> {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.tenantId, input.tenantId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  if (!subscription) return null;

  return {
    currentPeriodEnd: subscription.currentPeriodEnd,
    currentPeriodStart: subscription.currentPeriodStart,
    id: subscription.id,
    plan: null,
    status: subscription.status,
  };
}

export async function findPlan(
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
