import { describe, expect, it } from "vitest";
import {
  resolveFeatureLimit,
  resolveQuotaUsageWindow,
} from "./drizzleBillingQuotaGuard.js";

describe("resolveFeatureLimit", () => {
  const plateLookup = { limit: 300, trialLimit: 10 };

  it("always uses the effective catalog limit without trial overrides", () => {
    expect(resolveFeatureLimit(plateLookup)).toBe(300);
    expect(resolveFeatureLimit({ limit: 25, trialLimit: null })).toBe(25);
  });
});

describe("resolveQuotaUsageWindow", () => {
  it("uses UTC calendar-month boundaries for plate lookups", () => {
    expect(
      resolveQuotaUsageWindow(
        "plate_lookup",
        new Date("2026-08-31T23:59:59.999Z"),
      ),
    ).toEqual({
      start: new Date("2026-08-01T00:00:00.000Z"),
      end: new Date("2026-09-01T00:00:00.000Z"),
    });
  });

  it("rolls the allowance window over exactly at UTC month start", () => {
    expect(
      resolveQuotaUsageWindow(
        "plate_lookup",
        new Date("2026-09-01T00:00:00.000Z"),
      ),
    ).toEqual({
      start: new Date("2026-09-01T00:00:00.000Z"),
      end: new Date("2026-10-01T00:00:00.000Z"),
    });
  });

  it("handles the December to January boundary in UTC", () => {
    expect(
      resolveQuotaUsageWindow(
        "plate_lookup",
        new Date("2026-12-15T12:00:00.000Z"),
      ),
    ).toEqual({
      start: new Date("2026-12-01T00:00:00.000Z"),
      end: new Date("2027-01-01T00:00:00.000Z"),
    });
  });

  it("does not apply time windows to current-count quotas", () => {
    const checkedAt = new Date("2026-09-15T12:00:00.000Z");

    expect(resolveQuotaUsageWindow("seller", checkedAt)).toBeNull();
    expect(resolveQuotaUsageWindow("vehicle", checkedAt)).toBeNull();
  });
});
