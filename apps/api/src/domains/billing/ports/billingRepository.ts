import type { EntitlementKey, StoreId, TenantId } from "@lojaveiculosv2/shared";

export type BillingEntitlementStatus =
  "active" | "inactive" | "suspended" | "trialing";

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

export type BillingFinancialSummary = {
  monthlyRecurringCents: number;
  nextDueAt: Date | null;
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
  storeId: StoreId;
  storeName: string;
  storeSlug: string;
  subscriptionStatus: BillingSubscription["status"] | null;
};

export type BillingChargeableItem = {
  amountCents: number;
  description: string | null;
  endsAt: Date | null;
  fullAmountCents: number;
  id: string;
  itemType: "addon" | "plan";
  label: string;
  periodEnd: Date | null;
  periodStart: Date | null;
  prorationApplied: boolean;
  prorationFactor: number;
  quantity: number;
  sourceId: string | null;
  startsAt: Date | null;
  storeId: StoreId | null;
  storeName: string | null;
  unitAmountCents: number;
};

export type BillingChargePreviewLineItem = {
  allocationPercent: number;
  amountCents: number;
  description: string | null;
  endsAt: Date | null;
  fullAmountCents: number;
  id: string;
  itemType: "addon" | "plan";
  kind: "subscription_item";
  label: string;
  periodEnd: Date | null;
  periodStart: Date | null;
  prorationApplied: boolean;
  prorationFactor: number;
  quantity: number;
  sourceId: string | null;
  startsAt: Date | null;
  storeId: StoreId | null;
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
  endsAt: Date | null;
  featureKey: EntitlementKey;
  includedInPlan: boolean;
  limitValue: number | null;
  source: string | null;
  startsAt: Date | null;
  status: BillingEntitlementStatus;
};

export type BillingEntitlementEvent = {
  actorId: string | null;
  createdAt: Date;
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
  storeId: StoreId;
  subscription: BillingSubscription | null;
  tenantId: TenantId;
};

export type UpdateStoreEntitlementInput = {
  billingManagedBy?: "agency" | "store_owner";
  endsAt?: Date | null;
  featureKey: EntitlementKey;
  metadata?: Record<string, unknown>;
  actorId?: string | null;
  currentActorCanManage?: boolean;
  previousStatus?: BillingEntitlementStatus | null;
  reason?: string | null;
  source: string;
  startsAt?: Date | null;
  status: BillingEntitlementStatus;
  storeId: StoreId;
  tenantId: TenantId;
};

export type BillingRepository = {
  getOverview: (input: {
    billingManagedBy?: "agency" | "store_owner";
    currentActorCanManage?: boolean;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<BillingOverview>;
  updateStoreEntitlement: (
    input: UpdateStoreEntitlementInput,
  ) => Promise<BillingOverview>;
};
