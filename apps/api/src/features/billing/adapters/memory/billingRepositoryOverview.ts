import type {
  AgencyTenantOverview,
  BillingEntitlementEvent,
  BillingOverview,
  StoreEntitlement,
} from "../../../../domains/billing/ports/billingRepository.js";
import {
  createBillingAuthority,
  createBillingOverview,
} from "../../../../domains/billing/readModels/billingOverviewModel.js";
import {
  memoryBillingAddons,
  memoryBillingPlans,
} from "./billingMemoryCatalog.js";

export function toMemoryBillingOverview(
  storeId: string,
  tenantId: string,
  entitlements: StoreEntitlement[],
  entitlementEvents: BillingEntitlementEvent[],
  billingManagedBy: "agency" | "store_owner" = "store_owner",
  currentActorCanManage = true,
): BillingOverview {
  return createBillingOverview({
    addons: memoryBillingAddons,
    allocations: [
      {
        activeEntitlementCount: entitlements.filter(
          (item) => item.status === "active",
        ).length,
        addonCount: 0,
        monthlyAmountCents: 0,
        planCode: "free",
        planName: "Free",
        storeId: storeId as never,
        storeName: "Loja principal",
        storeSlug: "test-store",
        subscriptionStatus: "active",
      },
    ],
    authority: createBillingAuthority({
      billingManagedBy,
      currentActorCanManage,
    }),
    entitlementEvents,
    entitlements,
    financialSummary: {
      monthlyRecurringCents: 0,
      nextDueAt: null,
      openInvoiceCount: 0,
      overdueInvoiceCount: 0,
      paidThisPeriodCents: 0,
    },
    plans: memoryBillingPlans,
    storeId: storeId as never,
    subscription: {
      currentPeriodEnd: null,
      currentPeriodStart: null,
      id: "subscription_memory",
      plan: memoryBillingPlans[0] ?? null,
      status: "active",
    },
    tenantId: tenantId as never,
  });
}

export function toMemoryTenantOverview(
  overview: BillingOverview,
): AgencyTenantOverview {
  return {
    addons: overview.addons,
    allocations: overview.allocations,
    authority: overview.authority,
    chargePreview: overview.chargePreview,
    entitlementEvents: overview.entitlementEvents,
    financialSummary: overview.financialSummary,
    plans: overview.plans,
    stores: overview.allocations.map((allocation) => ({
      activeEntitlementCount: allocation.activeEntitlementCount,
      addonCount: allocation.addonCount,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      entitlementCount: overview.entitlements.length,
      entitlementMatrix: overview.entitlementMatrix,
      monthlyAmountCents: allocation.monthlyAmountCents,
      planCode: allocation.planCode,
      planName: allocation.planName,
      storeId: allocation.storeId,
      storeName: allocation.storeName,
      storeSlug: allocation.storeSlug,
      subscriptionStatus: allocation.subscriptionStatus,
      vehicleCount: 3,
    })),
    subscription: overview.subscription,
    tenant: {
      tenantId: overview.tenantId,
      tenantName: "Agency One",
      tenantSlug: "agency-one",
    },
    tenantId: overview.tenantId,
    usageAllowances: overview.usageAllowances,
  };
}
