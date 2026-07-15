const plan = {
  catalogVersion: "2026-07-v1",
  code: "growth",
  features: [
    {
      featureKey: "subdomain",
      included: true,
      includedInTrial: true,
      limitValue: null,
    },
    {
      featureKey: "crm",
      included: false,
      includedInTrial: false,
      limitValue: null,
    },
    {
      featureKey: "plate_lookup",
      included: true,
      includedInTrial: false,
      limitValue: 300,
    },
    {
      featureKey: "automation",
      included: true,
      includedInTrial: true,
      limitValue: null,
    },
    {
      featureKey: "analytics",
      included: true,
      includedInTrial: true,
      limitValue: null,
    },
    {
      featureKey: "compliance",
      included: true,
      includedInTrial: true,
      limitValue: null,
    },
    {
      featureKey: "custom_domain",
      included: true,
      includedInTrial: false,
      limitValue: null,
    },
    {
      featureKey: "nfe",
      included: false,
      includedInTrial: false,
      limitValue: null,
    },
    {
      featureKey: "external_api",
      included: false,
      includedInTrial: false,
      limitValue: null,
    },
    {
      featureKey: "marketplace",
      included: false,
      includedInTrial: false,
      limitValue: null,
    },
    {
      featureKey: "simulations",
      included: false,
      includedInTrial: false,
      limitValue: null,
    },
  ],
  id: "plan_growth",
  limits: { sellerLimit: 8, vehicleLimit: 300 },
  monthlyPriceCents: 29900,
  name: "Growth",
  status: "active",
} as const;

const matrix = [
  entitlement("subdomain", true, "active"),
  entitlement("crm", false, "active"),
  entitlement("plate_lookup", true, "active", 300),
  entitlement("automation", true, "active"),
  entitlement("nfe", false, "inactive"),
] as const;

const catalogAddons = [
  {
    catalogVersion: "2026-07-v1",
    code: "crm_whatsapp_instance",
    featureKey: "crm",
    id: "addon_crm_whatsapp",
    includedInTrial: false,
    monthlyPriceCents: 24999,
    name: "CRM WhatsApp",
    status: "active",
  },
  {
    catalogVersion: "2026-07-v1",
    code: "marketplace_connectors",
    featureKey: "marketplace",
    id: "addon_marketplaces",
    includedInTrial: false,
    monthlyPriceCents: 14990,
    name: "Marketplaces",
    status: "active",
  },
  {
    catalogVersion: "2026-07-v1",
    code: "nfe_spedy",
    featureKey: "nfe",
    id: "addon_nfe",
    includedInTrial: false,
    monthlyPriceCents: 19990,
    name: "NF-e integrada",
    status: "active",
  },
  {
    catalogVersion: "2026-07-v1",
    code: "public_api_access",
    featureKey: "external_api",
    id: "addon_public_api",
    includedInTrial: false,
    monthlyPriceCents: 9990,
    name: "API Pública",
    status: "active",
  },
  {
    catalogVersion: "2026-07-v1",
    code: "simulations_pro",
    featureKey: "simulations",
    id: "addon_simulations",
    includedInTrial: false,
    monthlyPriceCents: 4990,
    name: "Simulações Pro",
    status: "active",
  },
] as const;

const stores = [
  store("store_1", "Auto Prime Centro", "auto-prime-centro", 54899, matrix),
  store(
    "store_2",
    "Auto Prime Norte",
    "auto-prime-norte",
    29900,
    matrix.map((row) =>
      row.featureKey === "automation" ? { ...row, status: "inactive" } : row,
    ),
  ),
] as const;

const lineItems = [
  line("plan_1", "plan", "Growth", "store_1", "Auto Prime Centro", 29900),
  line(
    "addon_1",
    "addon",
    "CRM WhatsApp",
    "store_1",
    "Auto Prime Centro",
    24999,
  ),
  line("plan_2", "plan", "Growth", "store_2", "Auto Prime Norte", 29900),
] as const;

export const ownerBillingOverview = trialOverviewForStore(stores[0]);

export const agencyBillingOverview = {
  addons: catalogAddons,
  allocations: stores.map(toAllocation),
  authority: authority("agency"),
  chargePreview: chargePreview(),
  entitlementEvents: [],
  financialSummary: financialSummary(),
  plans: [plan],
  stores,
  subscription: subscription(),
  tenant: {
    tenantId: "tenant_1",
    tenantName: "Grupo Auto Prime",
    tenantSlug: "grupo-auto-prime",
  },
  tenantId: "tenant_1",
} as const;

function overviewForStore(selectedStore: (typeof stores)[number]) {
  return {
    addons: catalogAddons,
    allocations: [toAllocation(selectedStore)],
    authority: authority("store_owner"),
    chargePreview: chargePreview(selectedStore.storeId),
    entitlementEvents: [],
    entitlementMatrix: selectedStore.entitlementMatrix,
    entitlements: [],
    financialSummary: financialSummary(selectedStore.monthlyAmountCents),
    plans: [plan],
    storeId: selectedStore.storeId,
    subscription: subscription(),
    tenantId: "tenant_1",
  } as const;
}

function trialOverviewForStore(selectedStore: (typeof stores)[number]) {
  const trialEndsAt = "2026-08-14T00:00:00.000Z";
  const safeTrialKeys = [
    "analytics",
    "automation",
    "compliance",
    "subdomain",
  ] as const;
  const trialMatrix = plan.features.map((feature) =>
    entitlement(
      feature.featureKey,
      feature.included,
      safeTrialKeys.includes(
        feature.featureKey as (typeof safeTrialKeys)[number],
      )
        ? "trialing"
        : "inactive",
      feature.limitValue,
    ),
  );
  return {
    addons: catalogAddons,
    allocations: [
      {
        ...toAllocation(selectedStore),
        addonCount: 0,
        monthlyAmountCents: 0,
        planCode: null,
        planName: null,
        subscriptionStatus: "trialing",
      },
    ],
    authority: authority("store_owner"),
    chargePreview: emptyChargePreview(),
    entitlementEvents: [],
    entitlementMatrix: trialMatrix,
    entitlements: safeTrialKeys.map((featureKey) => ({
      endsAt: trialEndsAt,
      featureKey,
      metadata: { sourceDetail: "safe_trial_catalog" },
      source: "billing_catalog",
      startsAt: "2026-07-15T00:00:00.000Z",
      status: "trialing",
    })),
    financialSummary: financialSummary(0),
    plans: [plan],
    storeId: selectedStore.storeId,
    subscription: {
      currentPeriodEnd: trialEndsAt,
      currentPeriodStart: "2026-07-15T00:00:00.000Z",
      id: "subscription_trial",
      plan: null,
      status: "trialing",
    },
    tenantId: "tenant_1",
  } as const;
}

function emptyChargePreview() {
  return {
    cadence: "monthly",
    collectionMethod: "card_on_file",
    collectionTiming: "cycle_end",
    currency: "BRL",
    hasAgencyDiscount: false,
    lineItems: [],
    prorationPolicy: "store_days_active",
    subtotalCents: 0,
    totalCents: 0,
  } as const;
}

function entitlement(
  featureKey: string,
  includedInPlan: boolean,
  status: string,
  limitValue: number | null = null,
) {
  return {
    endsAt: null,
    featureKey,
    includedInPlan,
    limitValue,
    source: "billing_console",
    startsAt: null,
    status,
  };
}

function store(
  storeId: string,
  storeName: string,
  storeSlug: string,
  monthlyAmountCents: number,
  entitlementMatrix: readonly ReturnType<typeof entitlement>[],
) {
  return {
    activeEntitlementCount: entitlementMatrix.filter(
      (row) => row.status === "active" || row.status === "trialing",
    ).length,
    addonCount: monthlyAmountCents > plan.monthlyPriceCents ? 1 : 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    entitlementCount: entitlementMatrix.length,
    entitlementMatrix,
    monthlyAmountCents,
    planCode: plan.code,
    planName: plan.name,
    storeId,
    storeName,
    storeSlug,
    subscriptionStatus: "active",
    vehicleCount: 24,
  } as const;
}

function line(
  id: string,
  itemType: "addon" | "plan",
  label: string,
  storeId: string,
  storeName: string,
  amountCents: number,
) {
  return {
    allocationPercent: (amountCents / 84799) * 100,
    amountCents,
    description: itemType === "plan" ? "Plano base" : "Pacote opcional",
    endsAt: null,
    fullAmountCents: amountCents,
    id,
    itemType,
    kind: "subscription_item",
    label,
    periodEnd: "2026-07-31T00:00:00.000Z",
    periodStart: "2026-07-01T00:00:00.000Z",
    prorationApplied: false,
    prorationFactor: 1,
    quantity: 1,
    sourceId: id,
    startsAt: "2026-07-01T00:00:00.000Z",
    storeId,
    storeName,
    unitAmountCents: amountCents,
  } as const;
}

function toAllocation(selectedStore: (typeof stores)[number]) {
  return {
    activeEntitlementCount: selectedStore.activeEntitlementCount,
    addonCount: selectedStore.addonCount,
    monthlyAmountCents: selectedStore.monthlyAmountCents,
    planCode: selectedStore.planCode,
    planName: selectedStore.planName,
    storeId: selectedStore.storeId,
    storeName: selectedStore.storeName,
    storeSlug: selectedStore.storeSlug,
    subscriptionStatus: selectedStore.subscriptionStatus,
  } as const;
}

function authority(managedBy: "agency" | "store_owner") {
  const agencyManaged = managedBy === "agency";
  return {
    currentActorCanManage: true,
    managedBy,
    managerLabel: agencyManaged ? "Agência" : "Dono da loja",
    ownerBillingAccess: agencyManaged ? "blocked_by_agency" : "allowed",
    summary: agencyManaged
      ? "A agência gerencia a cobrança consolidada das lojas."
      : "Você gerencia a assinatura desta loja.",
  } as const;
}

function chargePreview(storeId?: string) {
  const selectedLines = storeId
    ? lineItems.filter((item) => item.storeId === storeId)
    : lineItems;
  const totalCents = selectedLines.reduce(
    (sum, item) => sum + item.amountCents,
    0,
  );
  return {
    cadence: "monthly",
    collectionMethod: "card_on_file",
    collectionTiming: "cycle_end",
    currency: "BRL",
    hasAgencyDiscount: false,
    lineItems: selectedLines,
    prorationPolicy: "store_days_active",
    subtotalCents: totalCents,
    totalCents,
  } as const;
}

function financialSummary(monthlyRecurringCents = 84799) {
  return {
    monthlyRecurringCents,
    nextDueAt: "2026-07-31T00:00:00.000Z",
    openInvoiceCount: 1,
    overdueInvoiceCount: 0,
    paidThisPeriodCents: monthlyRecurringCents,
  } as const;
}

function subscription() {
  return {
    currentPeriodEnd: "2026-07-31T00:00:00.000Z",
    currentPeriodStart: "2026-07-01T00:00:00.000Z",
    id: "subscription_1",
    plan,
    status: "active",
  } as const;
}
