import type {
  BillingEntitlementEvent,
  BillingOverview,
  BillingPlan,
  BillingRepository,
  StoreEntitlement,
} from "../../../../domains/billing/ports/billingRepository.js";
import { createBillingOverview } from "../../../../domains/billing/readModels/billingOverviewModel.js";

const defaultPlans: readonly BillingPlan[] = [
  {
    code: "growth",
    features: [
      { featureKey: "subdomain", included: true, limitValue: null },
      { featureKey: "crm", included: true, limitValue: null },
      { featureKey: "plate_lookup", included: true, limitValue: 300 },
      { featureKey: "external_api", included: false, limitValue: null },
      { featureKey: "marketplace", included: false, limitValue: null },
      { featureKey: "custom_domain", included: false, limitValue: null },
      { featureKey: "nfe", included: false, limitValue: null },
    ],
    id: "plan_growth",
    monthlyPriceCents: 29900,
    name: "Growth",
    status: "active",
  },
];

const defaultEntitlements: readonly StoreEntitlement[] = [
  {
    endsAt: null,
    featureKey: "subdomain",
    metadata: {},
    source: "memory_seed",
    startsAt: null,
    status: "active",
  },
  {
    endsAt: null,
    featureKey: "crm",
    metadata: {},
    source: "memory_seed",
    startsAt: null,
    status: "active",
  },
];

export function createMemoryBillingRepository(): BillingRepository {
  let entitlements = [...defaultEntitlements];
  let entitlementEvents: BillingEntitlementEvent[] = [];

  return {
    async getOverview(input) {
      return toOverview(
        input.storeId,
        input.tenantId,
        entitlements,
        entitlementEvents,
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
      );
    },
  };
}

function toOverview(
  storeId: string,
  tenantId: string,
  entitlements: StoreEntitlement[],
  entitlementEvents: BillingEntitlementEvent[],
): BillingOverview {
  return createBillingOverview({
    allocations: [
      {
        activeEntitlementCount: entitlements.filter(
          (item) => item.status === "active" || item.status === "trialing",
        ).length,
        addonCount: 0,
        monthlyAmountCents: 29900,
        planCode: "growth",
        planName: "Growth",
        storeId: storeId as never,
        storeName: "Loja principal",
        storeSlug: "test-store",
        subscriptionStatus: "trialing",
      },
    ],
    entitlementEvents,
    entitlements,
    financialSummary: {
      monthlyRecurringCents: 29900,
      nextDueAt: null,
      openInvoiceCount: 0,
      overdueInvoiceCount: 0,
      paidThisPeriodCents: 0,
    },
    plans: defaultPlans,
    storeId: storeId as never,
    subscription: {
      currentPeriodEnd: null,
      currentPeriodStart: null,
      id: "subscription_memory",
      plan: defaultPlans[0] ?? null,
      status: "trialing",
    },
    tenantId: tenantId as never,
  });
}
