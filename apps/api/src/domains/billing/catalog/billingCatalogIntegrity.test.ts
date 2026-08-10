import { describe, expect, it } from "vitest";
import { currentBillingCatalog } from "./currentBillingCatalog.js";
import {
  assertValidBillingCatalog,
  billingCatalogActivationAuditId,
  billingCatalogChecksum,
  canonicalBillingCatalogJson,
} from "./billingCatalogIntegrity.js";

describe("billing catalog integrity", () => {
  it("accepts the complete current commercial catalog", () => {
    expect(() =>
      assertValidBillingCatalog(currentBillingCatalog),
    ).not.toThrow();
    expect(currentBillingCatalog.version).toBe("2026-08-v2");
    expect(currentBillingCatalog.plans).toHaveLength(5);
    expect(currentBillingCatalog.addons).toHaveLength(6);
    expect(billingCatalogChecksum(currentBillingCatalog)).toBe(
      "af3fb0636be02707d94adebb39d3d81200dcb69c78690c2b171b7bc1d4a68cf7",
    );
  });

  it("normalizes set ordering before checksumming", () => {
    const reordered = {
      ...currentBillingCatalog,
      addons: [...currentBillingCatalog.addons].reverse(),
      plans: [...currentBillingCatalog.plans].reverse(),
    };

    expect(canonicalBillingCatalogJson(reordered)).toBe(
      canonicalBillingCatalogJson(currentBillingCatalog),
    );
    expect(billingCatalogChecksum(reordered)).toBe(
      billingCatalogChecksum(currentBillingCatalog),
    );
  });

  it("derives one stable audit identity per immutable version", () => {
    const currentId = billingCatalogActivationAuditId("2026-08-v2");

    expect(currentId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(billingCatalogActivationAuditId("2026-08-v2")).toBe(currentId);
    expect(billingCatalogActivationAuditId("2026-09-v1")).not.toBe(currentId);
  });

  it("rejects an incomplete plan feature matrix", () => {
    const [plan, ...remainingPlans] = currentBillingCatalog.plans;
    expect(plan).toBeDefined();
    const invalid = {
      ...currentBillingCatalog,
      plans: [
        { ...plan!, features: plan!.features.slice(1) },
        ...remainingPlans,
      ],
    };

    expect(() => assertValidBillingCatalog(invalid)).toThrow(
      "incomplete feature matrix",
    );
  });

  it("rejects trial limits that exceed paid limits", () => {
    const growth = currentBillingCatalog.plans.find(
      (plan) => plan.code === "growth",
    );
    expect(growth).toBeDefined();
    const invalid = {
      ...currentBillingCatalog,
      plans: currentBillingCatalog.plans.map((plan) =>
        plan.code === "growth"
          ? {
              ...plan,
              features: plan.features.map((feature) =>
                feature.featureKey === "plate_lookup"
                  ? { ...feature, trialLimitValue: 301 }
                  : feature,
              ),
            }
          : plan,
      ),
    };

    expect(() => assertValidBillingCatalog(invalid)).toThrow(
      "Invalid trial limit",
    );
  });
});
