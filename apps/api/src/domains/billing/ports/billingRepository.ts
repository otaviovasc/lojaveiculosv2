import type { EntitlementKey, StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  ActivateBillingSelectionInput,
  UpdateBillingSelectionInput,
} from "./billingSelection.js";
import type {
  BillingEntitlementStatus,
  UpdateStoreEntitlementInput,
} from "./billingEntitlement.js";

export type { UpdateBillingSelectionInput } from "./billingSelection.js";
export type {
  BillingEntitlementStatus,
  UpdateStoreEntitlementInput,
} from "./billingEntitlement.js";

export type BillingPlanFeature = {
  featureKey: EntitlementKey;
  included: boolean;
  includedInTrial: boolean;
  limitValue: number | null;
};

export type BillingPlan = {
  catalogVersion: string;
  code: string;
  features: readonly BillingPlanFeature[];
  id: string;
  limits: {
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

export type AgencyTenantSummary = {
  tenantId: TenantId;
  tenantName: string;
  tenantSlug: string;
};

export type AgencyManagedStoreOverview = {
  activeEntitlementCount: number;
  addonCount: number;
  createdAt: Date;
  entitlementCount: number;
  entitlementMatrix: readonly BillingEntitlementMatrixRow[];
  monthlyAmountCents: number;
  planCode: string | null;
  planName: string | null;
  storeId: StoreId;
  storeName: string;
  storeSlug: string;
  subscriptionStatus: BillingSubscription["status"] | null;
  vehicleCount: number;
};

export type BillingOverview = {
  addons: readonly BillingAddon[];
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

export type AgencyTenantOverview = {
  addons: readonly BillingAddon[];
  allocations: readonly BillingStoreAllocation[];
  authority: BillingAuthority;
  chargePreview: BillingChargePreview;
  entitlementEvents: readonly BillingEntitlementEvent[];
  financialSummary: BillingFinancialSummary;
  plans: readonly BillingPlan[];
  stores: readonly AgencyManagedStoreOverview[];
  subscription: BillingSubscription | null;
  tenant: AgencyTenantSummary;
  tenantId: TenantId;
};

export type BillingRepository = {
  activateSubscriptionSelection: (
    input: ActivateBillingSelectionInput,
  ) => Promise<void>;
  getOverview: (input: {
    billingManagedBy?: "agency" | "store_owner";
    currentActorCanManage?: boolean;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<BillingOverview>;
  getTenantOverview: (input: {
    currentActorCanManage?: boolean;
    tenantId: TenantId;
  }) => Promise<AgencyTenantOverview>;
  storeExistsInTenant: (input: {
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<boolean>;
  updateSubscriptionSelection: (
    input: UpdateBillingSelectionInput,
  ) => Promise<BillingOverview>;
  updateStoreEntitlement: (
    input: UpdateStoreEntitlementInput,
  ) => Promise<BillingOverview>;
};
