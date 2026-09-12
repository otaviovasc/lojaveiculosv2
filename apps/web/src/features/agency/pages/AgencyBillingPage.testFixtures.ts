import type {
  BillingOverview,
  BillingPlan,
  BillingSubscription,
} from "../../billing/types";

export function createAgencyBillingOverview(
  status: BillingSubscription["status"] | null,
): BillingOverview {
  const plans: readonly BillingPlan[] = [
    plan("free", "Free", 1, 0, "free", 10, 1),
    plan("essencial", "Essencial", 2, 19_700, "checkout", 75, 3),
    plan("operacao", "Operação", 3, 39_700, "checkout", 150, 5),
    plan("gestao", "Gestão", 4, 59_700, "checkout", 300, 10),
    plan("escala", "Escala", 5, 89_700, "quote_required", null, null),
  ];
  const currentPlan = plans[2];
  if (!currentPlan) throw new Error("Agency billing fixture plan is missing.");
  return {
    allocations: [],
    authority: {
      currentActorCanManage: true,
      managedBy: "agency",
      managerLabel: "Agência",
      ownerBillingAccess: "blocked_by_agency",
      summary: "A agência gerencia a cobrança.",
    },
    chargePreview: {
      cadence: "monthly",
      collectionMethod: "card_on_file",
      collectionTiming: "cycle_end",
      currency: "BRL",
      hasAgencyDiscount: false,
      lineItems: [],
      prorationPolicy: "store_days_active",
      subtotalCents: 39700,
      totalCents: 39700,
    },
    entitlementEvents: [],
    entitlementMatrix: [],
    entitlements: [],
    financialSummary: {
      monthlyRecurringCents: 39700,
      nextDueAt: null,
      openInvoiceCount: status === "past_due" ? 1 : 0,
      overdueInvoiceCount: status === "past_due" ? 1 : 0,
      paidThisPeriodCents: 0,
    },
    plans,
    storeId: "store_1",
    subscription: status
      ? {
          currentPeriodEnd: "2026-08-01T00:00:00.000Z",
          currentPeriodStart: "2026-07-01T00:00:00.000Z",
          id: "subscription_1",
          plan: currentPlan,
          status,
        }
      : null,
    tenantId: "tenant_1",
  };
}

function plan(
  code: string,
  name: string,
  selectionRank: number,
  monthlyPriceCents: number,
  checkoutMode: BillingPlan["checkoutMode"],
  vehicleLimit: number | null,
  sellerLimit: number | null,
): BillingPlan {
  return {
    capabilities: fixtureCapabilities[code] ?? [],
    catalogVersion: "2026-08-v3",
    checkoutMode,
    code,
    features: [],
    id: `plan_${code}`,
    limits: { sellerLimit, vehicleLimit },
    monthlyPriceCents,
    name,
    selectionRank,
    status: "active",
  };
}

const freeCapabilities = [
  "storefront_builder",
  "vehicle_listing_control",
  "public_interest_capture",
  "basic_lead_inbox",
] as const;
const essencialCapabilities = [
  ...freeCapabilities,
  "custom_domain",
  "reservations_and_sales",
  "customers",
  "internal_financing_workflow",
  "connected_financing_when_verified",
] as const;
const operacaoCapabilities = [
  ...essencialCapabilities,
  "full_crm",
  "official_channels",
  "byok_zapi",
  "document_workspace",
  "document_templates",
] as const;
const gestaoCapabilities = [
  ...operacaoCapabilities,
  "fiscal",
  "finance",
  "commissions",
  "analytics",
  "compliance",
  "checklists",
  "finance_auto_entry_rules",
] as const;
const fixtureCapabilities: Readonly<Record<string, readonly string[]>> = {
  essencial: essencialCapabilities,
  escala: [
    ...gestaoCapabilities,
    "marketplaces",
    "public_api_and_webhooks",
    "advanced_automation",
    "ai_studio",
    "resale_analysis_ai",
  ],
  free: freeCapabilities,
  gestao: gestaoCapabilities,
  operacao: operacaoCapabilities,
};
