import { describe, expect, it } from "vitest";
import { scheduledProviderIdentityIsValid } from "./drizzleBillingScheduledPaidActivation.js";

describe("scheduled paid activation provider identity", () => {
  it("rejects missing and local placeholder subscription ids", () => {
    expect(scheduledProviderIdentityIsValid(null)).toBe(false);
    expect(scheduledProviderIdentityIsValid("local_subscription_1")).toBe(
      false,
    );
    expect(scheduledProviderIdentityIsValid("sub_asaas_real")).toBe(true);
  });
});
