import type { EntitlementKey, StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { BillingAddonContract } from "./billingAddonContract.js";
import type { BillingAddon, BillingPlan } from "./billingCatalog.js";
import type { BillingEntitlementStatus } from "./billingEntitlement.js";

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

export type BillingChargePreviewLineItem = BillingChargeableItem & {
  allocationPercent: number;
  kind: "subscription_item";
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
  addonContracts: readonly BillingAddonContract[];
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

export type BillingUsageAllowance = {
  allowance: number;
  availability: "available" | "unavailable";
  enforcement: "hard" | "soft";
  key: "crm_composio_tool_executions";
  period: "billing_month";
  used: number | null;
};

export type BillingOverview = {
  addonContracts: readonly BillingAddonContract[];
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
  usageAllowances: readonly BillingUsageAllowance[];
};

export type AgencyTenantOverview = {
  addonContracts: readonly BillingAddonContract[];
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
  usageAllowances: readonly BillingUsageAllowance[];
};
