import type {
  AgencyTenantOverview,
  BillingEntitlementEvent,
  BillingAddon,
  BillingOverview,
  BillingPlan,
  BillingRepository,
  StoreEntitlement,
} from "../../../../domains/billing/ports/billingRepository.js";
import {
  createBillingAuthority,
  createBillingOverview,
} from "../../../../domains/billing/readModels/billingOverviewModel.js";

const defaultPlans: readonly BillingPlan[] = [
  {
    catalogVersion: "2026-07-v1",
    code: "growth",
    features: [
      { featureKey: "subdomain", included: true, limitValue: null },
      { featureKey: "crm", included: false, limitValue: null },
      { featureKey: "automation", included: true, limitValue: null },
      { featureKey: "plate_lookup", included: true, limitValue: 300 },
      { featureKey: "external_api", included: false, limitValue: null },
      { featureKey: "marketplace", included: false, limitValue: null },
      { featureKey: "custom_domain", included: false, limitValue: null },
      { featureKey: "nfe", included: false, limitValue: null },
    ],
    id: "plan_growth",
    limits: { sellerLimit: 8, vehicleLimit: 300 },
    monthlyPriceCents: 29900,
    name: "Growth",
    status: "active",
  },
];

const defaultAddons: readonly BillingAddon[] = [
  {
    catalogVersion: "2026-07-v1",
    code: "crm_whatsapp_instance",
    featureKey: "crm",
    id: "addon_crm",
    includedInTrial: true,
    monthlyPriceCents: 24999,
    name: "CRM WhatsApp",
    status: "active",
  },
];

const defaultEntitlements: readonly StoreEntitlement[] = [
  {
    endsAt: new Date("2099-08-01T00:00:00.000Z"),
    featureKey: "subdomain",
    metadata: {},
    source: "memory_seed",
    startsAt: null,
    status: "trialing",
  },
  {
    endsAt: new Date("2099-08-01T00:00:00.000Z"),
    featureKey: "automation",
    metadata: {},
    source: "memory_seed",
    startsAt: null,
    status: "trialing",
  },
  {
    endsAt: new Date("2099-08-01T00:00:00.000Z"),
    featureKey: "crm",
    metadata: {},
    source: "memory_seed",
    startsAt: null,
    status: "trialing",
  },
];

export function createMemoryBillingRepository(
  options: { storeId?: string; tenantId?: string } = {},
): BillingRepository {
  let entitlements = [...defaultEntitlements];
  let entitlementEvents: BillingEntitlementEvent[] = [];
  const managedStoreId = options.storeId ?? "store_1";
  const managedTenantId = options.tenantId;

  return {
    async getOverview(input) {
      return toOverview(
        input.storeId,
        input.tenantId,
        entitlements,
        entitlementEvents,
        input.billingManagedBy,
        input.currentActorCanManage,
      );
    },
    async getTenantOverview(input) {
      const overview = toOverview(
        managedStoreId,
        input.tenantId,
        entitlements,
        entitlementEvents,
        "agency",
        input.currentActorCanManage,
      );
      return toTenantOverview(overview);
    },
    async storeExistsInTenant(input) {
      return (
        input.storeId === managedStoreId &&
        (managedTenantId === undefined || input.tenantId === managedTenantId)
      );
    },
    async updateStoreEntitlement(input) {
      const before = entitlements.find(
        (entitlement) => entitlement.featureKey === input.featureKey,
      );
      entitlements = [
        ...entitlements.filter(
          (entitlement) => entitlement.featureKey !== input.featureKey,
        ),
        {
          endsAt: input.endsAt ?? null,
          featureKey: input.featureKey,
          metadata: input.metadata ?? {},
          source: input.source,
          startsAt: input.startsAt ?? null,
          status: input.status,
        },
      ].sort((left, right) => left.featureKey.localeCompare(right.featureKey));
      entitlementEvents = [
        {
          actorId: input.actorId ?? null,
          createdAt: new Date(),
          featureKey: input.featureKey,
          id: `event_${entitlementEvents.length + 1}`,
          metadata: input.metadata ?? {},
          nextStatus: input.status,
          previousStatus: input.previousStatus ?? before?.status ?? null,
          reason: input.reason ?? null,
          source: input.source,
        },
        ...entitlementEvents,
      ].slice(0, 25);

      return toOverview(
        input.storeId,
        input.tenantId,
        entitlements,
        entitlementEvents,
        input.billingManagedBy,
        input.currentActorCanManage,
      );
    },
  };
}

function toOverview(
  storeId: string,
  tenantId: string,
  entitlements: StoreEntitlement[],
  entitlementEvents: BillingEntitlementEvent[],
  billingManagedBy: "agency" | "store_owner" = "store_owner",
  currentActorCanManage = true,
): BillingOverview {
  return createBillingOverview({
    addons: defaultAddons,
    allocations: [
      {
        activeEntitlementCount: entitlements.filter(
          (item) => item.status === "active" || item.status === "trialing",
        ).length,
        addonCount: 1,
        monthlyAmountCents: 54899,
        planCode: "growth",
        planName: "Growth",
        storeId: storeId as never,
        storeName: "Loja principal",
        storeSlug: "test-store",
        subscriptionStatus: "trialing",
      },
    ],
    authority: createBillingAuthority({
      billingManagedBy,
      currentActorCanManage,
    }),
    entitlementEvents,
    entitlements,
    financialSummary: {
      monthlyRecurringCents: 54899,
      nextDueAt: null,
      openInvoiceCount: 0,
      overdueInvoiceCount: 0,
      paidThisPeriodCents: 0,
    },
    plans: defaultPlans,
    storeId: storeId as never,
    subscription: {
      currentPeriodEnd: new Date("2099-08-01T00:00:00.000Z"),
      currentPeriodStart: null,
      id: "subscription_memory",
      plan: defaultPlans[0] ?? null,
      status: "trialing",
    },
    tenantId: tenantId as never,
  });
}

function toTenantOverview(overview: BillingOverview): AgencyTenantOverview {
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
  };
}
