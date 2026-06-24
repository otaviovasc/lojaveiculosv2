import { describe, expect, it } from "vitest";
import { createBillingOverview } from "./billingOverviewModel.js";

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
    expect(overview.financialSummary.monthlyRecurringCents).toBe(0);
  });
});
