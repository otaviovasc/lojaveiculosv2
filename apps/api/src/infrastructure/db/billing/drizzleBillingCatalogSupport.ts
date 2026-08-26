import { and, asc, desc, eq, lte } from "drizzle-orm";
import { addons, planFeatures, plans, subscriptions } from "@lojaveiculosv2/db";
import type {
  BillingAddon,
  BillingPlan,
  BillingSubscription,
} from "../../../domains/billing/ports/billingRepository.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { findActiveBillingCatalogVersion } from "./drizzleActiveBillingCatalog.js";

export async function listPlans(
  db: DrizzleBillingClient,
  catalogVersion?: string | null,
): Promise<BillingPlan[]> {
  const resolvedCatalogVersion =
    catalogVersion === undefined
      ? await findActiveBillingCatalogVersion(db)
      : catalogVersion;
  if (!resolvedCatalogVersion) return [];
  const [planRows, featureRows] = await Promise.all([
    db
      .select()
      .from(plans)
      .where(
        and(
          eq(plans.catalogVersion, resolvedCatalogVersion),
          eq(plans.status, "active"),
          lte(plans.publishedAt, new Date()),
        ),
      )
      .orderBy(asc(plans.monthlyPriceCents))
      .limit(50),
    db.select().from(planFeatures).limit(500),
  ]);

  return planRows.map((plan) => ({
    capabilities: planCapabilities(plan.limits),
    catalogVersion: plan.catalogVersion,
    checkoutMode: planCheckoutMode(plan.limits),
    code: plan.code,
    features: featureRows
      .filter((feature) => feature.planId === plan.id)
      .map((feature) => ({
        featureKey: feature.featureKey as never,
        included: feature.included === 1,
        includedInTrial: feature.includedInTrial,
        limitValue: feature.limitValue,
        trialLimitValue: feature.trialLimitValue,
      })),
    id: plan.id,
    limits: toPlanLimits(plan.limits),
    monthlyPriceCents: plan.monthlyPriceCents,
    name: plan.name,
    selectionRank: planSelectionRank(plan.limits),
    status: plan.status,
  }));
}

export async function listAddons(
  db: DrizzleBillingClient,
  catalogVersion?: string | null,
): Promise<BillingAddon[]> {
  const resolvedCatalogVersion =
    catalogVersion === undefined
      ? await findActiveBillingCatalogVersion(db)
      : catalogVersion;
  if (!resolvedCatalogVersion) return [];
  const rows = await db
    .select()
    .from(addons)
    .where(
      and(
        eq(addons.catalogVersion, resolvedCatalogVersion),
        eq(addons.status, "active"),
        lte(addons.publishedAt, new Date()),
      ),
    )
    .orderBy(desc(addons.publishedAt))
    .limit(100);
  return rows.map((addon) => ({
    catalogVersion: addon.catalogVersion,
    code: addon.code,
    featureKey: addon.featureKey as never,
    id: addon.id,
    includedInTrial: addon.includedInTrial,
    limits: toAddonLimits(addon.limits),
    monthlyPriceCents: addon.monthlyPriceCents,
    name: addon.name,
    status: addon.status,
  }));
}

function toAddonLimits(value: unknown): NonNullable<BillingAddon["limits"]> {
  const limits =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const executionLimit = limits.composio_tool_executions_per_billing_month;
  const enforcement = limits.enforcement;
  const includedChannels = Array.isArray(limits.included_channels)
    ? limits.included_channels.filter(
        (channel): channel is "instagram" | "whatsapp_official" =>
          channel === "instagram" || channel === "whatsapp_official",
      )
    : [];
  return {
    composioToolExecutionsPerBillingMonth:
      typeof executionLimit === "number" && Number.isFinite(executionLimit)
        ? executionLimit
        : null,
    enforcement:
      enforcement === "soft" || enforcement === "hard" ? enforcement : null,
    includedChannels,
  };
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
    capabilities: planCapabilities(plan.limits),
    catalogVersion: plan.catalogVersion,
    checkoutMode: planCheckoutMode(plan.limits),
    code: plan.code,
    features: features.map((feature) => ({
      featureKey: feature.featureKey as never,
      included: feature.included === 1,
      includedInTrial: feature.includedInTrial,
      limitValue: feature.limitValue,
      trialLimitValue: feature.trialLimitValue,
    })),
    id: plan.id,
    limits: toPlanLimits(plan.limits),
    monthlyPriceCents: plan.monthlyPriceCents,
    name: plan.name,
    selectionRank: planSelectionRank(plan.limits),
    status: plan.status,
  };
}

function toPlanLimits(value: unknown): NonNullable<BillingPlan["limits"]> {
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

function planCapabilities(value: unknown): readonly string[] {
  const capabilities = asRecord(value).capabilities;
  return Array.isArray(capabilities)
    ? capabilities.filter((item): item is string => typeof item === "string")
    : [];
}

function planCheckoutMode(
  value: unknown,
): "checkout" | "free" | "quote_required" {
  const mode = asRecord(value).checkout_mode;
  return mode === "free" || mode === "quote_required" ? mode : "checkout";
}

function planSelectionRank(value: unknown): number {
  const rank = asRecord(value).selection_rank;
  return typeof rank === "number" && Number.isInteger(rank) ? rank : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
