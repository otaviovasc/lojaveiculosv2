import type { BillingOverview, BillingSubscription } from "../../billing/types";

export function createAgencyBillingOverview(
  status: BillingSubscription["status"] | null,
): BillingOverview {
  const plan = {
    catalogVersion: "2026-07-v1",
    code: "growth",
    features: [],
    id: "plan_growth",
    limits: { sellerLimit: 8, vehicleLimit: 300 },
    monthlyPriceCents: 54899,
    name: "Growth",
    status: "active" as const,
  };
  return {
    addons: [
      {
        catalogVersion: "2026-07-v1",
        code: "crm_whatsapp_instance",
        featureKey: "crm" as const,
        id: "addon_crm",
        includedInTrial: true,
        monthlyPriceCents: 24999,
        name: "CRM WhatsApp",
        status: "active" as const,
      },
    ],
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
      subtotalCents: 54899,
      totalCents: 54899,
    },
    entitlementEvents: [],
    entitlementMatrix: [],
    entitlements: [],
    financialSummary: {
      monthlyRecurringCents: 54899,
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
