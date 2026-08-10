import { currentBillingCatalog } from "../../../../domains/billing/catalog/currentBillingCatalog.js";
import type {
  BillingAddon,
  BillingPlan,
  StoreEntitlement,
} from "../../../../domains/billing/ports/billingRepository.js";

export const memoryBillingPlans: readonly BillingPlan[] =
  currentBillingCatalog.plans.map((plan) => ({
    catalogVersion: currentBillingCatalog.version,
    code: plan.code,
    features: plan.features,
    id: plan.id,
    limits: plan.limits,
    monthlyPriceCents: plan.monthlyPriceCents,
    name: plan.name,
    status: plan.status,
  }));

export const memoryBillingAddons: readonly BillingAddon[] =
  currentBillingCatalog.addons.map((addon) => ({
    catalogVersion: currentBillingCatalog.version,
    code: addon.code,
    featureKey: addon.featureKey,
    id: addon.id,
    includedInTrial: addon.includedInTrial,
    limits: {
      composioToolExecutionsPerBillingMonth:
        addon.limits.composioToolExecutionsPerBillingMonth ?? null,
      enforcement: addon.limits.enforcement ?? null,
      includedChannels: addon.limits.includedChannels ?? [],
    },
    monthlyPriceCents: addon.monthlyPriceCents,
    name: addon.name,
    status: addon.status,
  }));

const defaultPlan = currentBillingCatalog.plans.find((plan) => plan.isDefault);
if (!defaultPlan)
  throw new Error("Memory billing catalog has no default plan.");

export const memoryTrialEntitlements: readonly StoreEntitlement[] =
  defaultPlan.features
    .filter((feature) => feature.includedInTrial)
    .map((feature) => ({
      endsAt: new Date("2099-08-01T00:00:00.000Z"),
      featureKey: feature.featureKey,
      metadata: { catalogVersion: currentBillingCatalog.version },
      source: "memory_seed",
      startsAt: null,
      status: "trialing",
    }));
