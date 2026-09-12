export type BillingAuth = {
  accessToken?: string;
  clerkUserId?: string;
  storeSlug?: string;
};

export type EntitlementKey =
  | "analytics"
  | "ai"
  | "automation"
  | "checklists"
  | "commissions"
  | "compliance"
  | "crm"
  | "custom_domain"
  | "documents"
  | "external_api"
  | "finance"
  | "financing"
  | "fiscal"
  | "inventory"
  | "lead_capture"
  | "marketplace"
  | "plate_lookup"
  | "sales"
  | "storefront";

export type BillingEntitlementStatus =
  "active" | "inactive" | "suspended" | "trialing";

export type BillingPlan = {
  capabilities: readonly string[];
  catalogVersion: string;
  checkoutMode: "checkout" | "free" | "quote_required";
  code: string;
  features: readonly {
    featureKey: EntitlementKey;
    included: boolean;
    includedInTrial: boolean;
    limitValue: number | null;
    trialLimitValue: number | null;
  }[];
  id: string;
  limits: {
    sellerLimit: number | null;
    vehicleLimit: number | null;
  };
  monthlyPriceCents: number;
  name: string;
  selectionRank: number;
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
  billingPhase?: BillingPhase;
  effectiveContract?: {
    currentPeriodEnd: string | null;
    currentPeriodStart: string | null;
    planCode: string;
    planId: string;
    planName: string;
    unitAmountCents: number;
  } | null;
};

export type BillingProviderStatus = {
  configured: boolean;
  missingConfiguration: readonly string[];
  provider: "asaas";
  webhookConfigured: boolean;
};

export type BillingCheckoutBillingType = "CREDIT_CARD" | "PIX";

export type CreateBillingPlanHireInput = {
  billingTypes?: readonly BillingCheckoutBillingType[];
  idempotencyKey: string;
  planId: string;
  quoteId?: string;
};

/** Input used by the presentational checkout summary. Hiring uses CreateBillingPlanHireInput. */
export type CreateBillingCheckoutInput = {
  billingTypes?: readonly BillingCheckoutBillingType[];
  minutesToExpire?: number;
};

export type SyncBillingProviderSubscriptionInput = {
  billingType?: "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED";
  nextDueDate?: string;
  updatePendingPayments?: boolean;
};

export type BillingPlanHireStatus =
  | "created"
  | "checkout_created"
  | "payment_pending"
  | "activation_pending"
  | "paid_active"
  | "downgrade_scheduled"
  | "cancelled"
  | "expired"
  | "failed"
  | "reconciliation_failed";

export type BillingPhase =
  | "free_active"
  | "checkout_created"
  | "payment_pending"
  | "activation_pending"
  | "paid_active"
  | "past_due_grace"
  | "downgrade_scheduled"
  | "reconciliation_failed";

export type BillingPlanHire = {
  activatedAt: string | null;
  catalogVersion: string;
  checkoutMode: BillingPlan["checkoutMode"];
  checkoutUrl: string | null;
  completedAt: string | null;
  createdAt: string;
  failureCode: string | null;
  id: string;
  idempotencyKey: string;
  phase: BillingPhase;
  planId: string;
  planSnapshot: { code: string; name: string; selectionRank: number };
  providerCheckoutId: string | null;
  providerPaymentId: string | null;
  providerSubscriptionId: string | null;
  quotedCents: number;
  status: BillingPlanHireStatus;
  storeId: string;
  tenantId: string;
  updatedAt: string;
};

export type BillingPlanQuote = {
  catalogVersion: string;
  expiresAt: string | null;
  id: string;
  planId: string;
  quotedCents: number | null;
  status: "approved" | "expired" | "rejected" | "requested" | "used";
  storeId: string;
  tenantId: string;
};
