import { and, desc, eq, lte } from "drizzle-orm";
import { addons, planFeatures, plans, subscriptions } from "@lojaveiculosv2/db";
import type {
  BillingAddon,
  BillingPlan,
  BillingSubscription,
} from "../../../domains/billing/ports/billingRepository.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export async function listPlans(
  db: DrizzleBillingClient,
): Promise<BillingPlan[]> {
  const [planRows, featureRows] = await Promise.all([
    db
      .select()
      .from(plans)
      .where(
        and(eq(plans.status, "active"), lte(plans.publishedAt, new Date())),
      )
      .orderBy(desc(plans.publishedAt))
      .limit(50),
    db.select().from(planFeatures).limit(500),
  ]);

  return planRows.map((plan) => ({
    catalogVersion: plan.catalogVersion,
    code: plan.code,
    features: featureRows
      .filter((feature) => feature.planId === plan.id)
      .map((feature) => ({
        featureKey: feature.featureKey as never,
        included: feature.included === 1,
        includedInTrial: feature.includedInTrial,
        limitValue: feature.limitValue,
      })),
    id: plan.id,
    limits: toPlanLimits(plan.limits),
    monthlyPriceCents: plan.monthlyPriceCents,
    name: plan.name,
    status: plan.status,
  }));
}

export async function listAddons(
  db: DrizzleBillingClient,
): Promise<BillingAddon[]> {
  const rows = await db
    .select()
    .from(addons)
    .where(
      and(eq(addons.status, "active"), lte(addons.publishedAt, new Date())),
    )
    .orderBy(desc(addons.publishedAt))
    .limit(100);
  return rows.map((addon) => ({
    catalogVersion: addon.catalogVersion,
    code: addon.code,
    featureKey: addon.featureKey as never,
    id: addon.id,
    includedInTrial: addon.includedInTrial,
    monthlyPriceCents: addon.monthlyPriceCents,
    name: addon.name,
    status: addon.status,
  }));
}

export async function findTenantSubscription(
  db: DrizzleBillingClient,
  input: { tenantId: string },
  now: Date = new Date(),
): Promise<BillingSubscription | null> {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.tenantId, input.tenantId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  if (!subscription) return null;
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
    catalogVersion: plan.catalogVersion,
    code: plan.code,
    features: features.map((feature) => ({
      featureKey: feature.featureKey as never,
      included: feature.included === 1,
      includedInTrial: feature.includedInTrial,
      limitValue: feature.limitValue,
    })),
    id: plan.id,
    limits: toPlanLimits(plan.limits),
    monthlyPriceCents: plan.monthlyPriceCents,
    name: plan.name,
    status: plan.status,
  };
}

function toPlanLimits(value: unknown): BillingPlan["limits"] {
  const limits =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return {
    sellerLimit: toFiniteNumber(limits.seller_limit),
    vehicleLimit: toFiniteNumber(limits.vehicle_limit),
  };
}

function toFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
