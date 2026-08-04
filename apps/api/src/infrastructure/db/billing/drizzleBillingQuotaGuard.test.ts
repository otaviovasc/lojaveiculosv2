import { describe, expect, it } from "vitest";
import { resolveFeatureLimit } from "./drizzleBillingQuotaGuard.js";

describe("resolveFeatureLimit", () => {
  const plateLookup = { limit: 300, trialLimit: 10 };

  it("uses the trial-specific feature limit for trialing subscriptions", () => {
    expect(resolveFeatureLimit("trialing", plateLookup)).toBe(10);
  });

  it("keeps the paid feature limit for active subscriptions", () => {
    expect(resolveFeatureLimit("active", plateLookup)).toBe(300);
  });

  it("falls back to the paid limit when a catalog has no trial override", () => {
    expect(
      resolveFeatureLimit("trialing", { limit: 300, trialLimit: null }),
    ).toBe(300);
  });
});
