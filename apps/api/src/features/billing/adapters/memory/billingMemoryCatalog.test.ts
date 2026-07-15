import { describe, expect, it } from "vitest";
import {
  memoryBillingAddons,
  memoryBillingPlans,
  memoryTrialEntitlements,
} from "./billingMemoryCatalog.js";

describe("billing memory catalog contracts", () => {
  it("keeps active add-ons unique and outside the plan", () => {
    const planFeatures = new Set(
      memoryBillingPlans.flatMap((plan) =>
        plan.features
          .filter((feature) => feature.included)
          .map((feature) => feature.featureKey),
      ),
    );
    const addonFeatures = memoryBillingAddons.map((addon) => addon.featureKey);

    expect(new Set(addonFeatures).size).toBe(addonFeatures.length);
    expect(addonFeatures.some((feature) => planFeatures.has(feature))).toBe(
      false,
    );
  });

  it("keeps costly add-ons and custom domain outside the trial", () => {
    const trialFeatures = memoryTrialEntitlements.map(
      (entitlement) => entitlement.featureKey,
    );

    expect(trialFeatures).toEqual([
      "subdomain",
      "automation",
      "analytics",
      "compliance",
    ]);
    expect(trialFeatures).not.toContain("custom_domain");
    for (const addon of memoryBillingAddons) {
      expect(addon.includedInTrial).toBe(false);
      expect(trialFeatures).not.toContain(addon.featureKey);
    }
  });
});
