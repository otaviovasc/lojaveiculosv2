import { describe, expect, it } from "vitest";
import {
  isLocalZapiTestOverrideMetadata,
  resolveFeatureLimit,
} from "./drizzleBillingQuotaGuard.js";

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

describe("isLocalZapiTestOverrideMetadata", () => {
  it("accepts only the explicit local Z-API rehearsal override", () => {
    expect(
      isLocalZapiTestOverrideMetadata({
        billingBound: false,
        fixture: "local_seed",
        overrideContractVersion: "2026-07-capability-v1",
        provider: "zapi",
        reason: "local_zapi_webhook_rehearsal",
        testInstance: true,
      }),
    ).toBe(true);
  });

  it("rejects metadata that could represent a production entitlement", () => {
    expect(
      isLocalZapiTestOverrideMetadata({
        billingBound: true,
        fixture: "local_seed",
        overrideContractVersion: "2026-07-capability-v1",
        provider: "zapi",
        reason: "local_zapi_webhook_rehearsal",
        testInstance: true,
      }),
    ).toBe(false);
  });
});
