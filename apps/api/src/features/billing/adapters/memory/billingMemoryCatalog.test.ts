import { describe, expect, it } from "vitest";
import {
  memoryBillingAddons,
  memoryBillingPlans,
  memoryTrialEntitlements,
} from "./billingMemoryCatalog.js";

describe("billing memory catalog contracts", () => {
  it("derives one complete immutable version with unique products", () => {
    expect(
      memoryBillingPlans.every((plan) => plan.catalogVersion === "2026-08-v2"),
    ).toBe(true);
    expect(
      memoryBillingAddons.every(
        (addon) => addon.catalogVersion === "2026-08-v2",
      ),
    ).toBe(true);
    expect(new Set(memoryBillingPlans.map((plan) => plan.code)).size).toBe(5);
    expect(new Set(memoryBillingAddons.map((addon) => addon.code)).size).toBe(
      6,
    );
    expect(
      new Set(
        [...memoryBillingPlans, ...memoryBillingAddons].map((item) => item.id),
      ).size,
    ).toBe(11);
  });

  it("keeps provider-backed add-ons and custom domain outside the trial", () => {
    const trialFeatures = memoryTrialEntitlements.map(
      (entitlement) => entitlement.featureKey,
    );

    expect(trialFeatures).toEqual([
      "subdomain",
      "automation",
      "analytics",
      "compliance",
      "plate_lookup",
    ]);
    expect(trialFeatures).not.toContain("custom_domain");
    expect(
      memoryBillingPlans
        .find((plan) => plan.code === "growth")
        ?.features.find((feature) => feature.featureKey === "plate_lookup"),
    ).toMatchObject({
      includedInTrial: true,
      limitValue: 300,
      trialLimitValue: 10,
    });
    for (const addon of memoryBillingAddons) {
      expect(addon.includedInTrial).toBe(false);
      expect(trialFeatures).not.toContain(addon.featureKey);
    }
  });

  it("prices CRM at R$179 and optional Z-API at R$100", () => {
    const crm = memoryBillingAddons.find((addon) => addon.code === "crm_core");
    const zapi = memoryBillingAddons.find((addon) => addon.code === "crm_zapi");

    expect(crm?.monthlyPriceCents).toBe(17900);
    expect(zapi?.monthlyPriceCents).toBe(10000);
    expect((crm?.monthlyPriceCents ?? 0) + (zapi?.monthlyPriceCents ?? 0)).toBe(
      27900,
    );
    expect(crm?.limits).toEqual({
      composioToolExecutionsPerBillingMonth: 10000,
      enforcement: "soft",
      includedChannels: ["whatsapp_official", "instagram"],
    });
    expect(
      memoryBillingAddons.find((addon) => addon.code === "fiscal_spedy")
        ?.monthlyPriceCents,
    ).toBe(5000);
    expect(memoryBillingAddons.map((addon) => addon.code)).toEqual(
      expect.arrayContaining(["public_api_access", "simulations_pro"]),
    );
  });
});
