import type {
  BillingAddon,
  BillingPlan,
  StoreEntitlement,
} from "../../../../domains/billing/ports/billingRepository.js";

export const memoryBillingPlans: readonly BillingPlan[] = [
  {
    catalogVersion: "2026-07-v1",
    code: "growth",
    features: [
      feature("subdomain", true, true),
      feature("crm", false, false),
      feature("automation", true, true),
      feature("analytics", true, true),
      feature("compliance", true, true),
      feature("plate_lookup", true, false, 300),
      feature("external_api", false, false),
      feature("marketplace", false, false),
      feature("custom_domain", true, false),
      feature("nfe", false, false),
      feature("simulations", false, false),
    ],
    id: "plan_growth",
    limits: { sellerLimit: 8, vehicleLimit: 300 },
    monthlyPriceCents: 29900,
    name: "Growth",
    status: "active",
  },
];

export const memoryBillingAddons: readonly BillingAddon[] = [
  {
    catalogVersion: "2026-07-v1",
    code: "crm_whatsapp_instance",
    featureKey: "crm",
    id: "addon_crm",
    includedInTrial: false,
    monthlyPriceCents: 24999,
    name: "CRM WhatsApp",
    status: "active",
  },
];

export const memoryTrialEntitlements: readonly StoreEntitlement[] = [
  trial("subdomain"),
  trial("automation"),
  trial("analytics"),
  trial("compliance"),
];

function feature(
  featureKey: BillingPlan["features"][number]["featureKey"],
  included: boolean,
  includedInTrial: boolean,
  limitValue: number | null = null,
) {
  return { featureKey, included, includedInTrial, limitValue };
}

function trial(featureKey: StoreEntitlement["featureKey"]): StoreEntitlement {
  return {
    endsAt: new Date("2099-08-01T00:00:00.000Z"),
    featureKey,
    metadata: {},
    source: "memory_seed",
    startsAt: null,
    status: "trialing",
  };
}
