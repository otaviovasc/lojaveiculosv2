import type {
  BillingOverview,
  BillingPlan,
  BillingRepository,
  StoreEntitlement,
} from "../../../../domains/billing/ports/billingRepository.js";

const defaultPlans: readonly BillingPlan[] = [
  {
    code: "growth",
    features: [
      { featureKey: "subdomain", included: true, limitValue: null },
      { featureKey: "crm", included: true, limitValue: null },
      { featureKey: "plate_lookup", included: true, limitValue: 300 },
      { featureKey: "external_api", included: false, limitValue: null },
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

  return {
    async getOverview(input) {
      return toOverview(input.storeId, input.tenantId, entitlements);
    },
    async updateStoreEntitlement(input) {
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

      return toOverview(input.storeId, input.tenantId, entitlements);
    },
  };
}

function toOverview(
  storeId: string,
  tenantId: string,
  entitlements: StoreEntitlement[],
): BillingOverview {
  return {
    entitlements,
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
  };
}
