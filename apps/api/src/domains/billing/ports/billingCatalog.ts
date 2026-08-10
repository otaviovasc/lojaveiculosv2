import type { EntitlementKey } from "@lojaveiculosv2/shared";

export type BillingPlanFeature = {
  featureKey: EntitlementKey;
  included: boolean;
  includedInTrial: boolean;
  limitValue: number | null;
  trialLimitValue: number | null;
};

export type BillingPlan = {
  catalogVersion: string;
  code: string;
  features: readonly BillingPlanFeature[];
  id: string;
  limits?: {
    sellerLimit: number | null;
    vehicleLimit: number | null;
  };
  monthlyPriceCents: number;
  name: string;
  status: "active" | "archived" | "inactive";
};

export type BillingAddon = {
  catalogVersion: string;
  code: string;
  featureKey: EntitlementKey;
  id: string;
  includedInTrial: boolean;
  limits?: {
    composioToolExecutionsPerBillingMonth: number | null;
    enforcement: "hard" | "soft" | null;
    includedChannels: readonly ("instagram" | "whatsapp_official")[];
  };
  monthlyPriceCents: number;
  name: string;
  status: "active" | "archived" | "inactive";
};
