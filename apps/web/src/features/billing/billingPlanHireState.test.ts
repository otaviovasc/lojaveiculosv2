import { describe, expect, it } from "vitest";
import {
  isBillingPlanHireTerminal,
  trustedBillingPlanHireId,
} from "./billingPlanHireState";
import type { BillingPlanHire } from "./types";

describe("billing plan hire state", () => {
  it("never trusts a callback hire id without the matching persisted hire", () => {
    expect(
      trustedBillingPlanHireId({
        callbackHireId: "spoofed_hire",
        storedHireId: null,
      }),
    ).toBeNull();
    expect(
      trustedBillingPlanHireId({
        callbackHireId: "spoofed_hire",
        storedHireId: "trusted_hire",
      }),
    ).toBe("trusted_hire");
    expect(
      trustedBillingPlanHireId({
        callbackHireId: "trusted_hire",
        storedHireId: "trusted_hire",
      }),
    ).toBe("trusted_hire");
  });

  it("keeps every evidence-waiting status non-terminal", () => {
    for (const status of [
      "created",
      "checkout_created",
      "payment_pending",
      "activation_pending",
    ] as const) {
      expect(isBillingPlanHireTerminal({ status } as BillingPlanHire)).toBe(
        false,
      );
    }
    expect(
      isBillingPlanHireTerminal({
        status: "reconciliation_failed",
      } as BillingPlanHire),
    ).toBe(true);
  });
});
