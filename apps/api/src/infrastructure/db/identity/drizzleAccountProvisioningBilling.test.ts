import { describe, expect, it } from "vitest";
import { growthPlanFeatures } from "./drizzleAccountProvisioningBilling.js";

describe("account provisioning billing defaults", () => {
  it("includes automation in the production Growth plan", () => {
    expect(growthPlanFeatures).toContainEqual({
      featureKey: "automation",
      included: 1,
      limitValue: null,
    });
  });
});
