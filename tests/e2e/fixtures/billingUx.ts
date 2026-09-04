const catalogVersion = "2026-08-v3";
const entitlementKeys = [
  "storefront",
  "inventory",
  "lead_capture",
  "sales",
  "financing",
  "crm",
  "documents",
  "fiscal",
  "finance",
  "commissions",
  "analytics",
  "compliance",
  "checklists",
  "marketplace",
  "external_api",
  "automation",
  "ai",
  "custom_domain",
  "plate_lookup",
] as const;

const includedByPlan = {
  free: ["storefront", "inventory", "lead_capture", "plate_lookup"],
  essencial: [
    "storefront",
    "inventory",
    "lead_capture",
    "sales",
    "financing",
    "custom_domain",
    "plate_lookup",
  ],
  operacao: [
    "storefront",
    "inventory",
    "lead_capture",
    "sales",
    "financing",
    "crm",
    "documents",
    "custom_domain",
    "plate_lookup",
  ],
  gestao: [
    "storefront",
    "inventory",
    "lead_capture",
    "sales",
    "financing",
    "crm",
    "documents",
    "fiscal",
    "finance",
    "commissions",
    "analytics",
    "compliance",
    "checklists",
    "custom_domain",
    "plate_lookup",
  ],
  escala: entitlementKeys,
} as const;

const definitions = [
  ["free", "Free", 0, 1, "free", 10, 1, 3],
  ["essencial", "Essencial", 19_700, 2, "checkout", 75, 3, 25],
  ["operacao", "Operação", 39_700, 3, "checkout", 150, 5, 75],
  ["gestao", "Gestão", 59_700, 4, "checkout", 300, 10, 150],
  ["escala", "Escala", 89_700, 5, "quote_required", null, null, null],
] as const;

export const billingPlans = definitions.map(
  ([
    code,
    name,
    monthlyPriceCents,
    selectionRank,
    checkoutMode,
    vehicleLimit,
    sellerLimit,
    plateLimit,
  ]) => ({
    capabilities: [...includedByPlan[code]],
    catalogVersion,
    checkoutMode,
    code,
    features: entitlementKeys.map((featureKey) => ({
      featureKey,
      included: includedByPlan[code].includes(featureKey as never),
      includedInTrial: false,
      limitValue: featureKey === "plate_lookup" ? plateLimit : null,
      trialLimitValue: null,
    })),
    id: `83262608-0000-4000-8000-00000000000${selectionRank}`,
    limits: { sellerLimit, vehicleLimit },
    monthlyPriceCents,
    name,
    selectionRank,
    status: "active",
  }),
);

const freePlan = billingPlans[0]!;
const essencialPlan = billingPlans[1]!;
const operacaoPlan = billingPlans[2]!;
const stores = [
  store("store_1", "Auto Prime Centro", "auto-prime-centro", operacaoPlan),
  store("store_2", "Auto Prime Norte", "auto-prime-norte", essencialPlan),
] as const;

export const ownerBillingOverview = overviewForStore(
  store("store_owner", "Loja do Proprietário", "loja-proprietario", freePlan),
  "store_owner",
);

export const agencyBillingOverview = {
  ...overviewForStore(stores[0], "agency"),
  allocations: stores.map(toAllocation),
  chargePreview: chargePreview(stores),
  financialSummary: financialSummary(59_400),
  stores,
  tenant: {
    tenantId: "tenant_1",
    tenantName: "Grupo Auto Prime",
    tenantSlug: "grupo-auto-prime",
  },
} as const;

function overviewForStore(
  selectedStore: ReturnType<typeof store>,
  managedBy: "agency" | "store_owner",
) {
  return {
    addons: [],
    allocations: [toAllocation(selectedStore)],
    authority: authority(managedBy),
    billingPhase:
      selectedStore.plan.code === "free" ? "free_active" : "paid_active",
    chargePreview: chargePreview([selectedStore]),
    effectiveContract: {
      currentPeriodEnd:
        selectedStore.plan.code === "free" ? null : "2026-09-01T00:00:00.000Z",
      currentPeriodStart: "2026-08-01T00:00:00.000Z",
      planCode: selectedStore.plan.code,
      planId: selectedStore.plan.id,
      planName: selectedStore.plan.name,
      unitAmountCents: selectedStore.plan.monthlyPriceCents,
    },
    entitlementEvents: [],
    entitlementMatrix: selectedStore.entitlementMatrix,
    entitlements: selectedStore.entitlementMatrix
      .filter((row) => row.status === "active")
      .map((row) => ({
        endsAt: null,
        featureKey: row.featureKey,
        metadata: row.limitValue == null ? {} : { limitValue: row.limitValue },
        source: "billing_catalog",
        startsAt: "2026-08-01T00:00:00.000Z",
        status: "active",
      })),
    financialSummary: financialSummary(selectedStore.plan.monthlyPriceCents),
    plans: billingPlans,
    storeId: selectedStore.storeId,
    subscription: subscription(selectedStore.plan),
    tenantId: "tenant_1",
  } as const;
}

function store(
  storeId: string,
  storeName: string,
  storeSlug: string,
  plan: (typeof billingPlans)[number],
) {
  const entitlementMatrix = plan.features.map((feature) => ({
    endsAt: null,
    featureKey: feature.featureKey,
    includedInPlan: feature.included,
    limitValue: feature.limitValue,
    source: feature.included ? "billing_catalog" : null,
    startsAt: feature.included ? "2026-08-01T00:00:00.000Z" : null,
    status: feature.included ? "active" : "inactive",
  }));
  return {
    activeEntitlementCount: entitlementMatrix.filter(
      (row) => row.status === "active",
    ).length,
    addonCount: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    entitlementCount: entitlementMatrix.length,
    entitlementMatrix,
    monthlyAmountCents: plan.monthlyPriceCents,
    plan,
    planCode: plan.code,
    planName: plan.name,
    storeId,
    storeName,
    storeSlug,
    subscriptionStatus: "active",
    vehicleCount: 8,
  } as const;
}

function toAllocation(selectedStore: ReturnType<typeof store>) {
  return {
    activeEntitlementCount: selectedStore.activeEntitlementCount,
    addonCount: 0,
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

function chargePreview(selectedStores: readonly ReturnType<typeof store>[]) {
  const totalCents = selectedStores.reduce(
    (sum, selectedStore) => sum + selectedStore.plan.monthlyPriceCents,
    0,
  );
  return {
    cadence: "monthly",
    collectionMethod: "card_on_file",
    collectionTiming: "cycle_end",
    currency: "BRL",
    hasAgencyDiscount: false,
    lineItems: selectedStores.map((selectedStore) => ({
      allocationPercent:
        totalCents === 0
          ? 0
          : (selectedStore.plan.monthlyPriceCents / totalCents) * 100,
      amountCents: selectedStore.plan.monthlyPriceCents,
      description:
        selectedStore.plan.code === "free"
          ? "Contrato Free permanente"
          : "Plano mensal efetivo",
      endsAt: null,
      fullAmountCents: selectedStore.plan.monthlyPriceCents,
      id: `subscription_item_${selectedStore.storeId}`,
      itemType: "plan",
      kind: "subscription_item",
      label: selectedStore.plan.name,
      periodEnd:
        selectedStore.plan.code === "free" ? null : "2026-09-01T00:00:00.000Z",
      periodStart: "2026-08-01T00:00:00.000Z",
      prorationApplied: false,
      prorationFactor: 1,
      quantity: 1,
      sourceId: selectedStore.plan.id,
      startsAt: "2026-08-01T00:00:00.000Z",
      storeId: selectedStore.storeId,
      storeName: selectedStore.storeName,
      unitAmountCents: selectedStore.plan.monthlyPriceCents,
    })),
    prorationPolicy: "store_days_active",
    subtotalCents: totalCents,
    totalCents,
  } as const;
}

function financialSummary(monthlyRecurringCents: number) {
  return {
    monthlyRecurringCents,
    nextDueAt: monthlyRecurringCents === 0 ? null : "2026-09-01T00:00:00.000Z",
    openInvoiceCount: 0,
    overdueInvoiceCount: 0,
    paidThisPeriodCents: monthlyRecurringCents,
  } as const;
}

function subscription(plan: (typeof billingPlans)[number]) {
  return {
    currentPeriodEnd: plan.code === "free" ? null : "2026-09-01T00:00:00.000Z",
    currentPeriodStart: "2026-08-01T00:00:00.000Z",
    id: `subscription_${plan.code}`,
    plan,
    status: "active",
  } as const;
}
