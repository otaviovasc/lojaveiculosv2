import { describe, expect, it } from "vitest";
import { shouldPreserveExternalEntitlement } from "./drizzleBillingEntitlementProjection.js";

describe("shouldPreserveExternalEntitlement", () => {
  const now = new Date("2026-07-27T12:00:00.000Z");

  it("preserves an operator exception while its grant is effective", () => {
    expect(
      shouldPreserveExternalEntitlement(
        {
          endsAt: new Date("2026-08-27T12:00:00.000Z"),
          source: "operator_exception",
        },
        now,
      ),
    ).toBe(true);
  });

  it("allows billing projection to reclaim an expired exception", () => {
    expect(
      shouldPreserveExternalEntitlement(
        {
          endsAt: new Date("2026-07-26T12:00:00.000Z"),
          source: "operator_exception",
        },
        now,
      ),
    ).toBe(false);
  });

  it("never blocks billing-owned entitlements", () => {
    expect(
      shouldPreserveExternalEntitlement(
        { endsAt: null, source: "billing_catalog" },
        now,
      ),
    ).toBe(false);
  });
});
