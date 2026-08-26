import type { BillingOverview, BillingSubscription } from "../../billing/types";

export function createAgencyBillingOverview(
  status: BillingSubscription["status"] | null,
): BillingOverview {
  const plan = {
    capabilities: [],
    catalogVersion: "2026-08-v3",
    checkoutMode: "checkout" as const,
    code: "operacao",
    features: [],
    id: "plan_operacao",
    limits: { sellerLimit: 5, vehicleLimit: 150 },
    monthlyPriceCents: 39700,
    name: "Operação",
    selectionRank: 3,
    status: "active" as const,
  };
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
    plans: [plan],
    storeId: "store_1",
    subscription: status
      ? {
          currentPeriodEnd: "2026-08-01T00:00:00.000Z",
          currentPeriodStart: "2026-07-01T00:00:00.000Z",
          id: "subscription_1",
          plan,
          status,
        }
      : null,
    tenantId: "tenant_1",
  };
}
