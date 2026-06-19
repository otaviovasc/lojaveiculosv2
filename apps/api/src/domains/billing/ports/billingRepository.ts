import type { EntitlementKey, StoreId, TenantId } from "@lojaveiculosv2/shared";

export type BillingEntitlementStatus =
  | "active"
  | "inactive"
  | "suspended"
  | "trialing";

export type BillingPlanFeature = {
  featureKey: EntitlementKey;
  included: boolean;
  limitValue: number | null;
};

export type BillingPlan = {
  code: string;
  features: readonly BillingPlanFeature[];
  id: string;
  monthlyPriceCents: number;
  name: string;
  status: "active" | "archived" | "inactive";
};

export type BillingSubscription = {
  currentPeriodEnd: Date | null;
  currentPeriodStart: Date | null;
  id: string;
  plan: BillingPlan | null;
  status: "active" | "cancelled" | "expired" | "past_due" | "trialing";
};

export type StoreEntitlement = {
  endsAt: Date | null;
  featureKey: EntitlementKey;
  metadata: Record<string, unknown>;
  source: string;
  startsAt: Date | null;
  status: BillingEntitlementStatus;
};

export type BillingOverview = {
  entitlements: readonly StoreEntitlement[];
  plans: readonly BillingPlan[];
  storeId: StoreId;
  subscription: BillingSubscription | null;
  tenantId: TenantId;
};

export type UpdateStoreEntitlementInput = {
  endsAt?: Date | null;
  featureKey: EntitlementKey;
  metadata?: Record<string, unknown>;
  source: string;
  startsAt?: Date | null;
  status: BillingEntitlementStatus;
  storeId: StoreId;
  tenantId: TenantId;
};

export type BillingRepository = {
  getOverview: (input: {
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<BillingOverview>;
  updateStoreEntitlement: (
    input: UpdateStoreEntitlementInput,
  ) => Promise<BillingOverview>;
};
