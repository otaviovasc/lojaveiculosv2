import {
  createPlanFeatures,
  defineBillingCatalog,
} from "../billingCatalogDefinition.js";

const trialCore = [
  "subdomain",
  "automation",
  "analytics",
  "compliance",
  "plate_lookup",
] as const;

export const billingCatalog2026_08_v2 = defineBillingCatalog({
  addons: [
    {
      code: "crm_core",
      featureKey: "crm",
      id: "85251515-1515-4515-8515-151515151515",
      includedInTrial: false,
      limits: {
        composioToolExecutionsPerBillingMonth: 10_000,
        enforcement: "soft",
        includedChannels: ["whatsapp_official", "instagram"],
      },
      monthlyPriceCents: 17_900,
      name: "CRM",
      status: "active",
    },
    {
      code: "crm_zapi",
      featureKey: "crm_zapi",
      id: "85251515-1515-4515-8515-151515151520",
      includedInTrial: false,
      limits: {},
      monthlyPriceCents: 10_000,
      name: "Z-API para CRM",
      status: "active",
    },
    {
      code: "marketplace_connectors",
      featureKey: "marketplace",
      id: "85251515-1515-4515-8515-151515151516",
      includedInTrial: false,
      limits: {},
      monthlyPriceCents: 14_990,
      name: "Marketplaces",
      status: "active",
    },
    {
      code: "fiscal_spedy",
      featureKey: "fiscal",
      id: "85251515-1515-4515-8515-151515151517",
      includedInTrial: false,
      limits: {},
      monthlyPriceCents: 5_000,
      name: "Fiscal NF-e + NFS-e",
      status: "active",
    },
    {
      code: "public_api_access",
      featureKey: "external_api",
      id: "85251515-1515-4515-8515-151515151518",
      includedInTrial: false,
      limits: {},
      monthlyPriceCents: 9_990,
      name: "API Pública",
      status: "active",
    },
    {
      code: "simulations_pro",
      featureKey: "simulations",
      id: "85251515-1515-4515-8515-151515151519",
      includedInTrial: false,
      limits: {},
      monthlyPriceCents: 4_990,
      name: "Simulações Pro",
      status: "active",
    },
  ],
  plans: [
    plan({
      code: "basico",
      id: "82221212-1212-4212-8212-121212121210",
      included: ["subdomain"],
      includedInTrial: ["subdomain"],
      monthlyPriceCents: 0,
      name: "Básico",
      sellerLimit: 1,
      vehicleLimit: 30,
    }),
    plan({
      code: "premium",
      id: "82221212-1212-4212-8212-121212121211",
      included: ["subdomain", "automation", "analytics", "compliance"],
      includedInTrial: ["subdomain", "automation", "analytics", "compliance"],
      monthlyPriceCents: 9_997,
      name: "Premium",
      sellerLimit: 1,
      vehicleLimit: 30,
    }),
    plan({
      code: "estoque",
      id: "82221212-1212-4212-8212-121212121213",
      included: [
        "subdomain",
        "automation",
        "analytics",
        "compliance",
        "plate_lookup",
        "external_api",
        "simulations",
      ],
      includedInTrial: trialCore,
      monthlyPriceCents: 14_999,
      name: "Estoque",
      plateLookupLimit: 60,
      sellerLimit: 1,
      vehicleLimit: 60,
    }),
    plan({
      code: "pro",
      id: "82221212-1212-4212-8212-121212121214",
      included: [
        "subdomain",
        "custom_domain",
        "automation",
        "analytics",
        "compliance",
        "plate_lookup",
        "external_api",
        "simulations",
      ],
      includedInTrial: trialCore,
      monthlyPriceCents: 17_990,
      name: "Pro",
      plateLookupLimit: 100,
      sellerLimit: 1,
      vehicleLimit: 100,
    }),
    plan({
      code: "growth",
      id: "82221212-1212-4212-8212-121212121212",
      included: [
        "subdomain",
        "custom_domain",
        "automation",
        "analytics",
        "compliance",
        "plate_lookup",
      ],
      includedInTrial: trialCore,
      isDefault: true,
      monthlyPriceCents: 29_900,
      name: "Growth",
      plateLookupLimit: 300,
      sellerLimit: 8,
      vehicleLimit: 300,
    }),
  ],
  publishedAt: "2026-08-10T03:00:00.000Z",
  version: "2026-08-v2",
});

function plan(input: {
  code: string;
  id: string;
  included: Parameters<typeof createPlanFeatures>[0]["included"];
  includedInTrial: Parameters<typeof createPlanFeatures>[0]["includedInTrial"];
  isDefault?: boolean;
  monthlyPriceCents: number;
  name: string;
  plateLookupLimit?: number;
  sellerLimit: number;
  vehicleLimit: number;
}) {
  return {
    code: input.code,
    features: createPlanFeatures({
      included: input.included,
      includedInTrial: input.includedInTrial,
      ...(input.plateLookupLimit
        ? { limits: { plate_lookup: input.plateLookupLimit } }
        : {}),
      ...(input.includedInTrial.includes("plate_lookup")
        ? { trialLimits: { plate_lookup: 10 } }
        : {}),
    }),
    id: input.id,
    isDefault: input.isDefault ?? false,
    limits: {
      sellerLimit: input.sellerLimit,
      vehicleLimit: input.vehicleLimit,
    },
    monthlyPriceCents: input.monthlyPriceCents,
    name: input.name,
    status: "active" as const,
  };
}
