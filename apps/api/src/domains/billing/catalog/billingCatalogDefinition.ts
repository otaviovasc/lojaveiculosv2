import type { EntitlementKey } from "@lojaveiculosv2/shared";

export const billingCatalogFeatureKeys = [
  "storefront",
  "inventory",
  "lead_capture",
  "sales",
  "financing",
  "documents",
  "finance",
  "commissions",
  "checklists",
  "ai",
  "custom_domain",
  "crm",
  "automation",
  "analytics",
  "compliance",
  "external_api",
  "marketplace",
  "plate_lookup",
  "fiscal",
] as const satisfies readonly EntitlementKey[];

export const historicalBillingCatalogFeatureKeys = [
  "subdomain",
  "custom_domain",
  "crm",
  "crm_zapi",
  "automation",
  "analytics",
  "compliance",
  "external_api",
  "marketplace",
  "plate_lookup",
  "simulations",
  "fiscal",
] as const satisfies readonly EntitlementKey[];

export type BillingCatalogPlanFeature = {
  featureKey: EntitlementKey;
  included: boolean;
  includedInTrial: boolean;
  limitValue: number | null;
  trialLimitValue: number | null;
};

export type BillingCatalogPlan = {
  capabilities?: readonly string[];
  checkoutMode?: "checkout" | "free" | "quote_required";
  code: string;
  features: readonly BillingCatalogPlanFeature[];
  id: string;
  isDefault: boolean;
  limits: {
    sellerLimit: number | null;
    vehicleLimit: number | null;
  };
  monthlyPriceCents: number;
  name: string;
  selectionRank?: number;
  status: "active" | "archived" | "inactive";
};

export type BillingCatalogAddonLimits = {
  composioToolExecutionsPerBillingMonth?: number;
  enforcement?: "hard" | "soft";
  includedChannels?: readonly ("instagram" | "whatsapp_official")[];
};

export type BillingCatalogAddon = {
  code: string;
  featureKey: EntitlementKey;
  id: string;
  includedInTrial: boolean;
  limits: BillingCatalogAddonLimits;
  monthlyPriceCents: number;
  name: string;
  status: "active" | "archived" | "inactive";
};

export type BillingCatalogDefinition = {
  addons: readonly BillingCatalogAddon[];
  plans: readonly BillingCatalogPlan[];
  publishedAt: string;
  version: string;
};

export function defineBillingCatalog<const T extends BillingCatalogDefinition>(
  definition: T,
): T {
  return definition;
}

export function createPlanFeatures(input: {
  featureKeys?: readonly EntitlementKey[];
  included: readonly EntitlementKey[];
  includedInTrial: readonly EntitlementKey[];
  limits?: Partial<Record<EntitlementKey, number>>;
  trialLimits?: Partial<Record<EntitlementKey, number>>;
}): readonly BillingCatalogPlanFeature[] {
  const included = new Set(input.included);
  const includedInTrial = new Set(input.includedInTrial);
  return (input.featureKeys ?? billingCatalogFeatureKeys).map((featureKey) => ({
    featureKey,
    included: included.has(featureKey),
    includedInTrial: includedInTrial.has(featureKey),
    limitValue: input.limits?.[featureKey] ?? null,
    trialLimitValue: input.trialLimits?.[featureKey] ?? null,
  }));
}
