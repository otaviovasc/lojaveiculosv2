import { describe, expect, it } from "vitest";
import { currentBillingCatalog } from "./currentBillingCatalog.js";
import { billingCatalog2026_08_v2 } from "./versions/billingCatalog2026_08_v2.js";
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
    expect(currentBillingCatalog.version).toBe("2026-08-v3");
    expect(currentBillingCatalog.plans).toHaveLength(5);
    expect(currentBillingCatalog.addons).toHaveLength(0);
    expect(billingCatalogChecksum(currentBillingCatalog)).toBe(
      "32d2f1fe963c01124ffe5469ad166c68bc569c052409861ef12216065ed1ff3d",
    );
  });

  it("retains the immutable v2 catalog as historical registry data", () => {
    expect(() =>
      assertValidBillingCatalog(billingCatalog2026_08_v2),
    ).not.toThrow();
    expect(billingCatalogChecksum(billingCatalog2026_08_v2)).toBe(
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
    const currentId = billingCatalogActivationAuditId("2026-08-v3");

    expect(currentId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(billingCatalogActivationAuditId("2026-08-v3")).toBe(currentId);
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

  it("publishes cumulative monthly plans without trial or add-on semantics", () => {
    const expected = [
      ["free", 0, 10, 1, 3],
      ["essencial", 19_700, 75, 3, 25],
      ["operacao", 39_700, 150, 5, 75],
      ["gestao", 59_700, 300, 10, 150],
      ["escala", 89_700, null, null, null],
    ] as const;

    expect(
      currentBillingCatalog.plans.map((plan) => [
        plan.code,
        plan.monthlyPriceCents,
        plan.limits.vehicleLimit,
        plan.limits.sellerLimit,
        plan.features.find((feature) => feature.featureKey === "plate_lookup")
          ?.limitValue ?? null,
      ]),
    ).toEqual(expected);
    expect(currentBillingCatalog.plans[0]?.isDefault).toBe(true);
    expect(currentBillingCatalog.plans[4]?.checkoutMode).toBe("quote_required");
    expect(
      currentBillingCatalog.plans[0]?.features
        .filter((feature) => feature.included)
        .map((feature) => feature.featureKey),
    ).toEqual(["storefront", "inventory", "lead_capture", "plate_lookup"]);
    expect(
      currentBillingCatalog.plans[4]?.features.map(
        (feature) => feature.featureKey,
      ),
    ).not.toEqual(
      expect.arrayContaining(["subdomain", "simulations", "crm_zapi"]),
    );
    expect(
      currentBillingCatalog.plans.every((plan) =>
        plan.features.every(
          (feature) =>
            feature.includedInTrial === false &&
            feature.trialLimitValue === null,
        ),
      ),
    ).toBe(true);
  });

  it("keeps every paid plan cumulative", () => {
    const included = currentBillingCatalog.plans.map(
      (plan) =>
        new Set(
          plan.features
            .filter((feature) => feature.included)
            .map((feature) => feature.featureKey),
        ),
    );

    for (let index = 1; index < included.length; index += 1) {
      for (const feature of included[index - 1] ?? []) {
        expect(included[index]?.has(feature)).toBe(true);
      }
      for (const capability of currentBillingCatalog.plans[index - 1]
        ?.capabilities ?? []) {
        expect(
          currentBillingCatalog.plans[index]?.capabilities?.includes(
            capability,
          ),
        ).toBe(true);
      }
    }
  });

  it("rejects trial semantics in v3", () => {
    const invalid = {
      ...currentBillingCatalog,
      plans: currentBillingCatalog.plans.map((plan) =>
        plan.code === "free"
          ? {
              ...plan,
              features: plan.features.map((feature) =>
                feature.featureKey === "plate_lookup"
                  ? { ...feature, includedInTrial: true, trialLimitValue: 1 }
                  : feature,
              ),
            }
          : plan,
      ),
    };

    expect(() => assertValidBillingCatalog(invalid)).toThrow(
      "retired trial semantics",
    );
  });
});
