import { describe, expect, it } from "vitest";
import {
  activationIsDue,
  paidEvidenceCanActivateHire,
} from "./drizzleBillingPaidPlanActivation.js";
import {
  isActionablePaidObservation,
  nextPaymentStatus,
} from "./drizzleBillingPaymentWebhook.js";
import { statusAfterCheckoutBinding } from "./drizzleBillingPlanHireLifecycle.js";
import { assertIdempotentHireMatches } from "./drizzleBillingPlanHirePreparation.js";
import { graceDeadline } from "./drizzleBillingPaymentGrace.js";
import { overdueEvidenceCanEnterGrace } from "./drizzleBillingPaymentRecovery.js";
import { observedPaymentCanSetPending } from "./drizzleBillingPaymentHireState.js";
import { deriveReconciliationDate } from "./drizzleBillingProviderReconciliation.js";
import {
  canBindUnknownProviderSubscription,
  providerLifecyclePreservesFreeAccess,
} from "./drizzleBillingSubscriptionWebhook.js";
import { shouldApplyProviderLifecycle } from "./drizzleBillingSubscriptionLifecycle.js";
import { needsFreeFallbackReconciliation } from "./drizzleBillingFallbackReconciliation.js";
import {
  periodStartFromNextDueDate,
  renewedBillingPeriod,
} from "./billingPeriod.js";

describe("billing lifecycle decisions", () => {
  it("does not let late checkout binding regress confirmed payment", () => {
    expect(statusAfterCheckoutBinding("paid_active")).toBe("paid_active");
    expect(statusAfterCheckoutBinding("activation_pending")).toBe(
      "activation_pending",
    );
    expect(statusAfterCheckoutBinding("created")).toBe("checkout_created");
  });

  it("lets authoritative paid evidence repair out-of-order terminal states", () => {
    for (const status of [
      "cancelled",
      "expired",
      "failed",
      "reconciliation_failed",
    ] as const) {
      expect(
        paidEvidenceCanActivateHire({ quotedCents: 19700, status }, 19700),
      ).toBe(true);
    }
    expect(
      paidEvidenceCanActivateHire(
        { quotedCents: 19700, status: "downgrade_scheduled" },
        19700,
      ),
    ).toBe(false);
  });

  it("keeps the original seven-day grace deadline on duplicate overdue events", () => {
    const now = new Date("2026-08-20T12:00:00.000Z");
    const original = new Date("2026-08-27T12:00:00.000Z");

    expect(
      graceDeadline({ currentPeriodEnd: original, status: "past_due" }, now),
    ).toEqual(original);
    expect(
      graceDeadline({ currentPeriodEnd: null, status: "active" }, now),
    ).toEqual(original);
  });

  it("ignores provider cancellation while Free is effective or scheduled", () => {
    expect(providerLifecyclePreservesFreeAccess(false, false)).toBe(true);
    expect(providerLifecyclePreservesFreeAccess(true, true)).toBe(true);
    expect(providerLifecyclePreservesFreeAccess(false, true)).toBe(false);
  });

  it("binds a new pending hire but never rebinds a deleted paid recurrence", () => {
    expect(canBindUnknownProviderSubscription("payment_pending", true)).toBe(
      true,
    );
    expect(canBindUnknownProviderSubscription("paid_active", true)).toBe(false);
  });

  it("rejects reusing an idempotency key for another plan or quote", () => {
    expect(() =>
      assertIdempotentHireMatches(
        { planId: "essential", quoteId: null },
        { planId: "management" },
      ),
    ).toThrow(/unavailable/i);
    expect(() =>
      assertIdempotentHireMatches(
        { planId: "scale", quoteId: "quote_1" },
        { planId: "scale", quoteId: "quote_2" },
      ),
    ).toThrow(/unavailable/i);
  });

  it("derives a stable reconciliation date after the Free cutover clears period end", () => {
    expect(
      deriveReconciliationDate({
        createdAt: new Date("2026-08-25T00:00:00.000Z"),
        currentPeriodEnd: null,
        currentPeriodStart: new Date("2026-08-20T00:00:00.000Z"),
      }),
    ).toEqual(new Date("2026-09-20T00:00:00.000Z"));
  });

  it("never lets stale pending or overdue evidence regress a settled payment", () => {
    expect(nextPaymentStatus("paid", "pending")).toBe("paid");
    expect(nextPaymentStatus("paid", "overdue")).toBe("paid");
    expect(nextPaymentStatus("refunded", "paid")).toBe("refunded");
    expect(nextPaymentStatus("overdue", "paid")).toBe("paid");
    expect(isActionablePaidObservation("paid", "refunded")).toBe(false);
    expect(isActionablePaidObservation("paid", "paid")).toBe(true);
    expect(observedPaymentCanSetPending("activation_pending")).toBe(false);
    expect(observedPaymentCanSetPending("paid_active")).toBe(false);
    expect(
      overdueEvidenceCanEnterGrace(
        new Date("2026-09-01T00:00:00.000Z"),
        new Date("2026-08-01T00:00:00.000Z"),
      ),
    ).toBe(false);
    expect(
      overdueEvidenceCanEnterGrace(
        new Date("2026-09-01T00:00:00.000Z"),
        new Date("2026-09-01T00:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("rejects stale or regressive provider subscription lifecycle events", () => {
    const observedAt = new Date("2026-08-25T12:00:00.000Z");
    expect(
      shouldApplyProviderLifecycle(
        {
          currentPeriodEnd: new Date("2026-09-25T00:00:00.000Z"),
          providerLifecycleObservedAt: observedAt,
          status: "past_due",
        },
        {
          currentPeriodEnd: new Date("2026-09-01T00:00:00.000Z"),
          observedAt: new Date("2026-08-24T12:00:00.000Z"),
          status: "active",
        },
      ),
    ).toBe(false);
    expect(
      shouldApplyProviderLifecycle(
        {
          currentPeriodEnd: new Date("2026-09-25T00:00:00.000Z"),
          providerLifecycleObservedAt: observedAt,
          status: "expired",
        },
        {
          currentPeriodEnd: new Date("2026-10-25T00:00:00.000Z"),
          observedAt: new Date("2026-08-26T12:00:00.000Z"),
          status: "active",
        },
      ),
    ).toBe(false);
  });

  it("does not activate a paid renewal before its persisted boundary", () => {
    const boundary = new Date("2026-09-25T00:00:00.000Z");
    expect(
      activationIsDue(boundary, new Date("2026-09-24T23:59:59.999Z")),
    ).toBe(false);
    expect(activationIsDue(boundary, boundary)).toBe(true);
  });

  it("advances both renewal boundaries without regressing on stale payment evidence", () => {
    const renewed = renewedBillingPeriod(
      {
        currentPeriodEnd: new Date("2026-09-25T00:00:00.000Z"),
        currentPeriodStart: new Date("2026-08-25T00:00:00.000Z"),
      },
      new Date("2026-09-25T00:00:00.000Z"),
    );
    expect(renewed).toEqual({
      currentPeriodEnd: new Date("2026-10-25T00:00:00.000Z"),
      currentPeriodStart: new Date("2026-09-25T00:00:00.000Z"),
    });
    expect(
      renewedBillingPeriod(renewed, new Date("2026-08-25T00:00:00.000Z")),
    ).toEqual(renewed);
  });

  it("clamps end-of-month renewal periods instead of skipping a month", () => {
    expect(
      renewedBillingPeriod(
        { currentPeriodEnd: null, currentPeriodStart: null },
        new Date("2026-08-31T00:00:00.000Z"),
      ),
    ).toEqual({
      currentPeriodEnd: new Date("2026-09-30T00:00:00.000Z"),
      currentPeriodStart: new Date("2026-08-31T00:00:00.000Z"),
    });
    expect(
      periodStartFromNextDueDate(new Date("2026-03-31T00:00:00.000Z")),
    ).toEqual(new Date("2026-02-28T00:00:00.000Z"));
  });

  it("enqueues provider cancellation only for a real fallback recurrence", () => {
    expect(needsFreeFallbackReconciliation("sub_real")).toBe(true);
    expect(needsFreeFallbackReconciliation("local_subscription")).toBe(false);
    expect(needsFreeFallbackReconciliation(null)).toBe(false);
  });
});
