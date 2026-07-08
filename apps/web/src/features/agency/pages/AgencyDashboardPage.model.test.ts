import { describe, expect, it } from "vitest";
import { mapAgencyOverviewToStores } from "./AgencyDashboardPage.model";
import type { AgencyTenantOverview } from "../apiClient";

describe("AgencyDashboardPage model", () => {
  it("maps tenant overview stores into dashboard rows", () => {
    const stores = mapAgencyOverviewToStores({
      allocations: [],
      authority: {
        currentActorCanManage: true,
        managedBy: "agency",
        managerLabel: "Agencia",
        ownerBillingAccess: "blocked_by_agency",
        summary: "A agencia gerencia a cobranca das lojas vinculadas.",
      },
      chargePreview: {
        cadence: "monthly",
        collectionMethod: "card_on_file",
        collectionTiming: "cycle_end",
        currency: "BRL",
        hasAgencyDiscount: false,
        lineItems: [],
        prorationPolicy: "store_days_active",
        subtotalCents: 29900,
        totalCents: 29900,
      },
      entitlementEvents: [],
      financialSummary: {
        monthlyRecurringCents: 29900,
        nextDueAt: null,
        openInvoiceCount: 0,
        overdueInvoiceCount: 0,
        paidThisPeriodCents: 0,
      },
      plans: [],
      subscription: {
        currentPeriodEnd: "2026-08-01T00:00:00.000Z",
        currentPeriodStart: null,
        id: "subscription_1",
        plan: null,
        status: "active",
      },
      stores: [
        {
          activeEntitlementCount: 2,
          addonCount: 1,
          createdAt: "2026-07-01T00:00:00.000Z",
          entitlementCount: 3,
          entitlementMatrix: [],
          monthlyAmountCents: 29900,
          planCode: "growth",
          planName: "Growth",
          storeId: "store_1",
          storeName: "Auto Prime",
          storeSlug: "auto-prime",
          subscriptionStatus: "active",
          vehicleCount: 7,
        },
      ],
      tenant: {
        tenantId: "tenant_1",
        tenantName: "Agency One",
        tenantSlug: "agency-one",
      },
      tenantId: "tenant_1",
    } satisfies AgencyTenantOverview);

    expect(stores).toEqual([
      expect.objectContaining({
        _count: { veiculos: 7 },
        data_criacao: "2026-07-01T00:00:00.000Z",
        nome_da_loja: "Auto Prime",
        plano: "Growth",
        status_assinatura: "ATIVA",
        subdominio: "auto-prime",
      }),
    ]);
  });
});
