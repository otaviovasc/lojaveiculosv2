import { describe, expect, it } from "vitest";
import type { BillingCatalogPlan } from "../../../domains/billing/catalog/billingCatalogDefinition.js";
import {
  fromDatabasePlanMetadata,
  toDatabasePlanLimits,
} from "./drizzleBillingCatalogDeploymentMapping.js";

describe("billing catalog deployment mapping", () => {
  it("does not synthesize v3 metadata for an immutable historical plan", () => {
    expect(
      fromDatabasePlanMetadata({
        seller_limit: 1,
        vehicle_limit: 30,
      }),
    ).toEqual({});
  });

  it("restores persisted v3 plan metadata", () => {
    expect(
      fromDatabasePlanMetadata({
        capabilities: ["storefront", "inventory"],
        checkout_mode: "quote_required",
        selection_rank: 5,
      }),
    ).toEqual({
      capabilities: ["storefront", "inventory"],
      checkoutMode: "quote_required",
      selectionRank: 5,
    });
  });

  it("writes optional metadata only for catalogs that define it", () => {
    const historicalPlan = plan();
    const currentPlan = plan({
      capabilities: ["storefront"],
      checkoutMode: "free",
      selectionRank: 1,
    });

    expect(toDatabasePlanLimits(historicalPlan)).toEqual({
      seller_limit: 1,
      vehicle_limit: 30,
    });
    expect(toDatabasePlanLimits(currentPlan)).toEqual({
      capabilities: ["storefront"],
      checkout_mode: "free",
      selection_rank: 1,
      seller_limit: 1,
      vehicle_limit: 30,
    });
  });
});

function plan(
  metadata: Pick<
    BillingCatalogPlan,
    "capabilities" | "checkoutMode" | "selectionRank"
  > = {},
): BillingCatalogPlan {
  return {
    ...metadata,
    code: "plan",
    features: [],
    id: "82221212-1212-4212-8212-121212121210",
    isDefault: true,
    limits: { sellerLimit: 1, vehicleLimit: 30 },
    monthlyPriceCents: 0,
    name: "Plan",
    status: "active",
  };
}
