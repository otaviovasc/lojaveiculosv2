import { describe, expect, it } from "vitest";
import {
  createBillingAuthority,
  createBillingOverview,
} from "./billingOverviewModel.js";
import { createChargeableItem } from "./billingChargePreviewModel.js";

describe("createBillingOverview", () => {
  it("marks an active entitlement inactive after its effective end", () => {
    const now = new Date("2026-09-10T00:00:00.000Z");
    const overview = createBillingOverview({
      entitlements: [
        {
          endsAt: now,
          featureKey: "crm",
          metadata: {},
          source: "billing_catalog",
          startsAt: new Date("2026-08-10T00:00:00.000Z"),
          status: "active",
        },
      ],
      now,
      plans: [],
      storeId: "store_1" as never,
      subscription: null,
      tenantId: "tenant_1" as never,
    });

    expect(
      overview.entitlementMatrix.find((row) => row.featureKey === "crm")
        ?.status,
    ).toBe("inactive");
  });

  it("builds agency billing matrix and financial summary defaults", () => {
    const overview = createBillingOverview({
      allocations: [
        {
          activeEntitlementCount: 2,
          addonCount: 0,
          monthlyAmountCents: 59700,
          planCode: "gestao",
          planName: "Gestao",
          storeId: "store_1" as never,
          storeName: "Loja Centro",
          storeSlug: "loja-centro",
          subscriptionStatus: "active",
        },
      ],
      entitlements: [
        {
          endsAt: null,
          featureKey: "finance",
          metadata: { limitValue: 120 },
          source: "billing_catalog",
          startsAt: null,
          status: "active",
        },
      ],
      plans: [],
      storeId: "store_1" as never,
      subscription: null,
      tenantId: "tenant_1" as never,
    });

    const finance = overview.entitlementMatrix.find(
      (row) => row.featureKey === "finance",
    );
    expect(overview.allocations).toHaveLength(1);
    expect(finance).toMatchObject({ limitValue: 120, status: "active" });
    expect(overview.authority.managedBy).toBe("store_owner");
    expect(overview.chargePreview.totalCents).toBe(59700);
    expect(overview.chargePreview.lineItems[0]).toMatchObject({
      allocationPercent: 100,
      amountCents: 59700,
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

  it("calculates charge preview from the effective plan contract", () => {
    const periodStart = new Date("2026-07-01T00:00:00.000Z");
    const periodEnd = new Date("2026-07-31T00:00:00.000Z");
    const overview = createBillingOverview({
      chargeables: [
        createChargeableItem({
          id: "item_plan",
          itemType: "plan",
          label: "Gestao",
          periodEnd,
          periodStart,
          quantity: 1,
          startsAt: periodStart,
          storeId: "store_1" as never,
          storeName: "Loja Centro",
          unitAmountCents: 59700,
        }),
      ],
      entitlements: [],
      plans: [],
      storeId: "store_1" as never,
      subscription: null,
      tenantId: "tenant_1" as never,
    });

    expect(overview.chargePreview.totalCents).toBe(59700);
    expect(overview.chargePreview.lineItems).toEqual([
      expect.objectContaining({
        allocationPercent: 100,
        amountCents: 59700,
        fullAmountCents: 59700,
        itemType: "plan",
        prorationApplied: false,
        prorationFactor: 1,
      }),
    ]);
  });
});
