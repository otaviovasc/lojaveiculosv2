import { describe, expect, it } from "vitest";
import {
  memoryBillingAddons,
  memoryDefaultEntitlements,
  memoryBillingPlans,
} from "./billingMemoryCatalog.js";

describe("billing memory catalog contracts", () => {
  it("derives one complete immutable version with unique products", () => {
    expect(
      memoryBillingPlans.every((plan) => plan.catalogVersion === "2026-08-v3"),
    ).toBe(true);
    expect(memoryBillingAddons).toEqual([]);
    expect(new Set(memoryBillingPlans.map((plan) => plan.code)).size).toBe(5);
    expect(
      new Set(
        [...memoryBillingPlans, ...memoryBillingAddons].map((item) => item.id),
      ).size,
    ).toBe(5);
  });

  it("projects permanent Free entitlements without trial semantics", () => {
    const freeFeatures = memoryDefaultEntitlements.map(
      (entitlement) => entitlement.featureKey,
    );

    expect(freeFeatures).toEqual([
      "storefront",
      "inventory",
      "lead_capture",
      "plate_lookup",
    ]);
    expect(
      memoryDefaultEntitlements.every((item) => item.status === "active"),
    ).toBe(true);
    expect(
      memoryDefaultEntitlements.every((item) => item.endsAt === null),
    ).toBe(true);
    expect(
      memoryBillingPlans
        .find((plan) => plan.code === "free")
        ?.features.find((feature) => feature.featureKey === "plate_lookup"),
    ).toMatchObject({
      includedInTrial: false,
      limitValue: 3,
      trialLimitValue: null,
    });
  });

  it("publishes the approved monthly prices and quote-only Escala", () => {
    expect(memoryBillingPlans.map((plan) => plan.monthlyPriceCents)).toEqual([
      0, 19_700, 39_700, 59_700, 89_700,
    ]);
    expect(memoryBillingPlans.at(-1)).toMatchObject({
      checkoutMode: "quote_required",
      code: "escala",
    });
  });
});
