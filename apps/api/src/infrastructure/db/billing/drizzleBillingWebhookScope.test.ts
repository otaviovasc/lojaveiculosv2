import { describe, expect, it } from "vitest";
import { chooseCorrelatedHire } from "./drizzleBillingWebhookScope.js";

type HireCandidate = {
  id: string;
  status: "activation_pending" | "failed" | "paid_active" | "payment_pending";
};

describe("chooseCorrelatedHire", () => {
  it("selects the pending renewal when a provider subscription is reused", () => {
    const previous = candidate("previous", "paid_active");
    const renewal = candidate("renewal", "payment_pending");

    expect(chooseCorrelatedHire([[renewal, previous]])).toEqual(renewal);
  });

  it("intersects checkout or external-reference evidence with reused subscription evidence", () => {
    const previous = candidate("previous", "paid_active");
    const renewal = candidate("renewal", "activation_pending");

    expect(chooseCorrelatedHire([[renewal, previous], [renewal]])).toEqual(
      renewal,
    );
  });

  it("keeps contradictory provider identities pending reconciliation", () => {
    const first = candidate("first", "payment_pending");
    const second = candidate("second", "payment_pending");

    expect(chooseCorrelatedHire([[first], [second]])).toBeNull();
  });

  it("allows corrected evidence to repair a previously failed hire", () => {
    const failed = candidate("failed", "failed");

    expect(chooseCorrelatedHire([[failed]])).toEqual(failed);
  });
});

function candidate(id: string, status: HireCandidate["status"]): HireCandidate {
  return { id, status };
}
