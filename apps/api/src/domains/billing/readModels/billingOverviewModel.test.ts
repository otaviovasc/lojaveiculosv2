import { describe, expect, it } from "vitest";
import {
  createBillingAuthority,
  createBillingOverview,
} from "./billingOverviewModel.js";
import { createChargeableItem } from "./billingChargePreviewModel.js";

describe("createBillingOverview", () => {
  it("builds agency billing matrix and financial summary defaults", () => {
    const overview = createBillingOverview({
      allocations: [
        {
          activeEntitlementCount: 2,
          addonCount: 1,
          monthlyAmountCents: 49900,
          planCode: "agency",
          planName: "Agency",
          storeId: "store_1" as never,
          storeName: "Loja Centro",
          storeSlug: "loja-centro",
          subscriptionStatus: "active",
        },
      ],
      entitlements: [
        {
          endsAt: null,
          featureKey: "marketplace",
          metadata: { limitValue: 120 },
          source: "billing_console",
          startsAt: null,
          status: "active",
        },
      ],
      plans: [],
      storeId: "store_1" as never,
      subscription: null,
      tenantId: "tenant_1" as never,
    });

    const marketplace = overview.entitlementMatrix.find(
      (row) => row.featureKey === "marketplace",
    );

    expect(overview.allocations).toHaveLength(1);
    expect(marketplace?.status).toBe("active");
    expect(marketplace?.limitValue).toBe(120);
    expect(overview.authority.managedBy).toBe("store_owner");
    expect(overview.chargePreview.totalCents).toBe(49900);
    expect(overview.chargePreview.hasAgencyDiscount).toBe(false);
    expect(overview.chargePreview.lineItems[0]).toMatchObject({
      allocationPercent: 100,
      amountCents: 49900,
      kind: "subscription_item",
      storeName: "Loja Centro",
    });
    expect(overview.financialSummary.monthlyRecurringCents).toBe(0);
  });

  it("blocks owner billing access when an agency manages billing", () => {
    const authority = createBillingAuthority({
      billingManagedBy: "agency",
      currentActorCanManage: false,
    });

    expect(authority).toMatchObject({
      currentActorCanManage: false,
      managedBy: "agency",
      managerLabel: "Agencia",
      ownerBillingAccess: "blocked_by_agency",
    });
  });

  it("calculates charge preview from real subscription chargeables", () => {
    const periodStart = new Date("2026-07-01T00:00:00.000Z");
    const periodEnd = new Date("2026-07-31T00:00:00.000Z");
    const overview = createBillingOverview({
      chargeables: [
        createChargeableItem({
          id: "item_plan",
          itemType: "plan",
          label: "Growth",
          periodEnd,
          periodStart,
          quantity: 1,
          startsAt: periodStart,
          storeId: "store_1" as never,
          storeName: "Loja Centro",
          unitAmountCents: 29900,
        }),
        createChargeableItem({
          id: "item_addon",
          itemType: "addon",
          label: "CRM WhatsApp",
          periodEnd,
          periodStart,
          quantity: 1,
          startsAt: new Date("2026-07-16T00:00:00.000Z"),
          storeId: "store_1" as never,
          storeName: "Loja Centro",
          unitAmountCents: 24999,
        }),
      ],
      entitlements: [],
      plans: [],
      storeId: "store_1" as never,
      subscription: null,
      tenantId: "tenant_1" as never,
    });

    expect(overview.chargePreview.totalCents).toBe(42400);
    expect(overview.chargePreview.lineItems).toEqual([
      expect.objectContaining({
        allocationPercent: 70.52,
        amountCents: 29900,
        fullAmountCents: 29900,
        itemType: "plan",
        prorationApplied: false,
        prorationFactor: 1,
      }),
      expect.objectContaining({
        allocationPercent: 29.48,
        amountCents: 12500,
        fullAmountCents: 24999,
        itemType: "addon",
        prorationApplied: true,
        prorationFactor: 0.5,
      }),
    ]);
  });
});
