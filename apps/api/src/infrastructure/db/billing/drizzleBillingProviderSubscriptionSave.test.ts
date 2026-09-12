import { describe, expect, it } from "vitest";
import { providerSubscriptionStateCanApply } from "./drizzleBillingProviderSubscriptionSave.js";

describe("providerSubscriptionStateCanApply", () => {
  const observationStartedAt = new Date("2026-08-26T12:00:00.000Z");

  it("rejects an OVERDUE observation when payment confirmation updated the active contract meanwhile", () => {
    expect(
      providerSubscriptionStateCanApply({
        currentLifecycleObservedAt: new Date("2026-08-26T12:00:01.000Z"),
        currentStatus: "active",
        currentUpdatedAt: new Date("2026-08-26T12:00:01.000Z"),
        expectedStatus: "active",
        observationStartedAt,
      }),
    ).toBe(false);
  });

  it("rejects a provider observation after any concurrent local status change", () => {
    expect(
      providerSubscriptionStateCanApply({
        currentLifecycleObservedAt: null,
        currentStatus: "past_due",
        currentUpdatedAt: new Date("2026-08-26T12:00:01.000Z"),
        expectedStatus: "active",
        observationStartedAt,
      }),
    ).toBe(false);
  });

  it("accepts an observation when identity and lifecycle remained unchanged", () => {
    expect(
      providerSubscriptionStateCanApply({
        currentLifecycleObservedAt: new Date("2026-08-26T11:59:00.000Z"),
        currentStatus: "active",
        currentUpdatedAt: new Date("2026-08-26T11:59:00.000Z"),
        expectedStatus: "active",
        observationStartedAt,
      }),
    ).toBe(true);
  });
});
