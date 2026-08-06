import type {
  BillingAddon,
  BillingPlan,
  StoreEntitlement,
} from "../../../../domains/billing/ports/billingRepository.js";

export const memoryBillingPlans: readonly BillingPlan[] = [
  {
    catalogVersion: "2026-07-v1",
    code: "basico",
    features: [
      feature("subdomain", true, true),
      feature("crm", false, false),
      feature("automation", false, false),
      feature("analytics", false, false),
      feature("compliance", false, false),
      feature("plate_lookup", false, false),
      feature("external_api", false, false),
      feature("marketplace", false, false),
      feature("custom_domain", false, false),
      feature("fiscal", false, false),
      feature("simulations", false, false),
    ],
    id: "plan_basico",
    limits: { sellerLimit: 1, vehicleLimit: 30 },
    monthlyPriceCents: 0,
    name: "Básico",
    status: "active",
  },
  {
    catalogVersion: "2026-07-v1",
    code: "premium",
    features: [
      feature("subdomain", true, true),
      feature("crm", false, false),
      feature("automation", true, true),
      feature("analytics", true, true),
      feature("compliance", true, true),
      feature("plate_lookup", false, false),
      feature("external_api", false, false),
      feature("marketplace", false, false),
      feature("custom_domain", false, false),
      feature("fiscal", false, false),
      feature("simulations", false, false),
    ],
    id: "plan_premium",
    limits: { sellerLimit: 1, vehicleLimit: 30 },
    monthlyPriceCents: 9997,
    name: "Premium",
    status: "active",
  },
  {
    catalogVersion: "2026-07-v1",
    code: "estoque",
    features: [
      feature("subdomain", true, true),
      feature("crm", false, false),
      feature("automation", true, true),
      feature("analytics", true, true),
      feature("compliance", true, true),
      feature("plate_lookup", true, true, 60, 60),
      feature("external_api", true, true),
      feature("marketplace", false, false),
      feature("custom_domain", false, false),
      feature("fiscal", false, false),
      feature("simulations", true, true),
    ],
    id: "plan_estoque",
    limits: { sellerLimit: 1, vehicleLimit: 60 },
    monthlyPriceCents: 14999,
    name: "Estoque",
    status: "active",
  },
  {
    catalogVersion: "2026-07-v1",
    code: "pro",
    features: [
      feature("subdomain", true, true),
      feature("crm", false, false),
      feature("automation", true, true),
      feature("analytics", true, true),
      feature("compliance", true, true),
      feature("plate_lookup", true, true, 100, 100),
      feature("external_api", true, true),
      feature("marketplace", false, false),
      feature("custom_domain", true, true),
      feature("fiscal", false, false),
      feature("simulations", true, true),
    ],
    id: "plan_pro",
    limits: { sellerLimit: 1, vehicleLimit: 100 },
    monthlyPriceCents: 17990,
    name: "Pro",
    status: "active",
  },
  {
    catalogVersion: "2026-07-v1",
    code: "growth",
    features: [
      feature("subdomain", true, true),
      feature("crm", false, false),
      feature("automation", true, true),
      feature("analytics", true, true),
      feature("compliance", true, true),
      feature("plate_lookup", true, true, 300, 10),
      feature("external_api", false, false),
      feature("marketplace", false, false),
      feature("custom_domain", true, false),
      feature("fiscal", false, false),
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
    monthlyPriceCents: 24900,
    name: "CRM WhatsApp",
    status: "active",
  },
  addon(
    "addon_custom_domain",
    "custom_domain_addon",
    "custom_domain",
    2000,
    "Domínio Próprio",
  ),
  addon(
    "addon_marketplaces",
    "marketplace_connectors",
    "marketplace",
    14990,
    "Marketplaces",
  ),
  addon("addon_fiscal", "fiscal_spedy", "fiscal", 3500, "Fiscal NF-e + NFS-e"),
  addon(
    "addon_public_api",
    "public_api_access",
    "external_api",
    5000,
    "API & Integrações",
  ),
  addon(
    "addon_plate_lookup",
    "auto_placa_lookup",
    "plate_lookup",
    3000,
    "Consulta de Placas",
  ),
  addon(
    "addon_simulations",
    "simulations_pro",
    "simulations",
    4990,
    "Simulações Pro",
  ),
];

export const memoryTrialEntitlements: readonly StoreEntitlement[] = [
  trial("subdomain"),
  trial("automation"),
  trial("analytics"),
  trial("compliance"),
  trial("plate_lookup"),
];

function feature(
  featureKey: BillingPlan["features"][number]["featureKey"],
  included: boolean,
  includedInTrial: boolean,
  limitValue: number | null = null,
  trialLimitValue: number | null = null,
) {
  return {
    featureKey,
    included,
    includedInTrial,
    limitValue,
    trialLimitValue,
  };
}

function addon(
  id: string,
  code: string,
  featureKey: BillingAddon["featureKey"],
  monthlyPriceCents: number,
  name: string,
): BillingAddon {
  return {
    catalogVersion: "2026-07-v1",
    code,
    featureKey,
    id,
    includedInTrial: false,
    monthlyPriceCents,
    name,
    status: "active",
  };
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
