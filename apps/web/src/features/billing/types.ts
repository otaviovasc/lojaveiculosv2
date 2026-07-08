export type BillingAuth = {
  accessToken?: string;
  clerkUserId?: string;
  storeSlug?: string;
};

export type EntitlementKey =
  | "analytics"
  | "compliance"
  | "crm"
  | "custom_domain"
  | "external_api"
  | "marketplace"
  | "nfe"
  | "plate_lookup"
  | "subdomain";

export type BillingEntitlementStatus =
  "active" | "inactive" | "suspended" | "trialing";

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

export type BillingFinancialSummary = {
  monthlyRecurringCents: number;
  nextDueAt: string | null;
  openInvoiceCount: number;
  overdueInvoiceCount: number;
  paidThisPeriodCents: number;
};

export type BillingAuthority = {
  currentActorCanManage: boolean;
  managedBy: "agency" | "store_owner";
  managerLabel: string;
  ownerBillingAccess: "allowed" | "blocked_by_agency";
  summary: string;
};

export type BillingStoreAllocation = {
  activeEntitlementCount: number;
  addonCount: number;
  monthlyAmountCents: number;
  planCode: string | null;
  planName: string | null;
  storeId: string;
  storeName: string;
  storeSlug: string;
  subscriptionStatus: BillingSubscription["status"] | null;
};

export type BillingChargePreviewLineItem = {
  allocationPercent: number;
  amountCents: number;
  description: string | null;
  endsAt: string | null;
  fullAmountCents: number;
  id: string;
  itemType: "addon" | "plan";
  kind: "subscription_item";
  label: string;
  periodEnd: string | null;
  periodStart: string | null;
  prorationApplied: boolean;
  prorationFactor: number;
  quantity: number;
  sourceId: string | null;
  startsAt: string | null;
  storeId: string | null;
  storeName: string | null;
  unitAmountCents: number;
};

export type BillingChargePreview = {
  cadence: "monthly";
  collectionMethod: "card_on_file";
  collectionTiming: "cycle_end";
  currency: "BRL";
  hasAgencyDiscount: false;
  lineItems: readonly BillingChargePreviewLineItem[];
  prorationPolicy: "store_days_active";
  subtotalCents: number;
  totalCents: number;
};

export type BillingEntitlementMatrixRow = {
  endsAt: string | null;
  featureKey: EntitlementKey;
  includedInPlan: boolean;
  limitValue: number | null;
  source: string | null;
  startsAt: string | null;
  status: BillingEntitlementStatus;
};

export type BillingEntitlementEvent = {
  actorId: string | null;
  createdAt: string;
  featureKey: EntitlementKey;
  id: string;
  metadata: Record<string, unknown>;
  nextStatus: BillingEntitlementStatus;
  previousStatus: BillingEntitlementStatus | null;
  reason: string | null;
  source: string;
};

export type BillingOverview = {
  allocations: readonly BillingStoreAllocation[];
  authority: BillingAuthority;
  chargePreview: BillingChargePreview;
  entitlementEvents: readonly BillingEntitlementEvent[];
  entitlementMatrix: readonly BillingEntitlementMatrixRow[];
  entitlements: readonly StoreEntitlement[];
  financialSummary: BillingFinancialSummary;
  plans: readonly BillingPlan[];
  storeId: string;
  subscription: BillingSubscription | null;
  tenantId: string;
};

export type BillingProviderStatus = {
  configured: boolean;
  missingConfiguration: readonly string[];
  provider: "asaas";
  webhookConfigured: boolean;
};

export type BillingCheckoutBillingType = "CREDIT_CARD" | "PIX";

export type CreateBillingCheckoutInput = {
  billingTypes?: readonly BillingCheckoutBillingType[];
  minutesToExpire?: number;
  nextDueDate?: string;
};

export type BillingCheckoutSession = {
  checkoutUrl: string;
  expiresAt: string | null;
  externalReference: string;
  provider: "asaas";
  providerCheckoutId: string;
  subscriptionId: string;
};

export type UpdateEntitlementInput = {
  endsAt?: string | null;
  featureKey: EntitlementKey;
  metadata?: Record<string, unknown>;
  reason?: string | null;
  startsAt?: string | null;
  status: BillingEntitlementStatus;
};
