export type BillingAuth = {
  accessToken?: string;
  clerkUserId?: string;
  storeSlug?: string;
};

export type EntitlementKey =
  | "crm"
  | "custom_domain"
  | "external_api"
  | "nfe"
  | "plate_lookup"
  | "subdomain";

export type BillingEntitlementStatus =
  | "active"
  | "inactive"
  | "suspended"
  | "trialing";

export type BillingPlan = {
  code: string;
  features: readonly {
    featureKey: EntitlementKey;
    included: boolean;
    limitValue: number | null;
  }[];
  id: string;
  monthlyPriceCents: number;
  name: string;
  status: "active" | "archived" | "inactive";
};

export type BillingSubscription = {
  currentPeriodEnd: string | null;
  currentPeriodStart: string | null;
  id: string;
  plan: BillingPlan | null;
  status: "active" | "cancelled" | "expired" | "past_due" | "trialing";
};

export type StoreEntitlement = {
  endsAt: string | null;
  featureKey: EntitlementKey;
  metadata: Record<string, unknown>;
  source: string;
  startsAt: string | null;
  status: BillingEntitlementStatus;
};

export type BillingOverview = {
  entitlements: readonly StoreEntitlement[];
  plans: readonly BillingPlan[];
  storeId: string;
  subscription: BillingSubscription | null;
  tenantId: string;
};

export type UpdateEntitlementInput = {
  endsAt?: string | null;
  featureKey: EntitlementKey;
  metadata?: Record<string, unknown>;
  startsAt?: string | null;
  status: BillingEntitlementStatus;
};
