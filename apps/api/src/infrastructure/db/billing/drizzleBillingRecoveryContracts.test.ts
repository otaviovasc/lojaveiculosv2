import { describe, expect, it } from "vitest";
import {
  currentPlanItemGrantsPaidAccess,
  subscriptionCanEnterGrace,
} from "./drizzleBillingPaymentGrace.js";
import {
  overdueEvidenceCanEnterGrace,
  overdueFallsWithinCurrentPeriod,
} from "./drizzleBillingOverduePayment.js";
import { paymentCanRestoreCurrentContract } from "./drizzleBillingPaymentRecovery.js";
import { planItemIsEffectiveAt } from "./drizzleBillingRepositoryReads.js";
import { providerSubscriptionCanBind } from "./drizzleBillingScheduledProviderBinding.js";
import { renewedBillingPeriod } from "./billingPeriod.js";

const currentPayment = {
  amountCents: 19_700,
  currentPeriodEnd: new Date("2026-10-02T00:00:00.000Z"),
  currentPeriodStart: new Date("2026-08-26T00:00:00.000Z"),
  dueAt: new Date("2026-09-26T00:00:00.000Z"),
  expectedAmountCents: 19_700,
  provider: "asaas",
  providerSubscriptionId: "sub_current",
  subscriptionProvider: "asaas",
  subscriptionProviderId: "sub_current",
  subscriptionStatus: "past_due" as const,
};

describe("billing recovery contracts", () => {
  it("restores the current matching billing competence", () => {
    expect(paymentCanRestoreCurrentContract(currentPayment)).toBe(true);
    expect(
      paymentCanRestoreCurrentContract({
        ...currentPayment,
        subscriptionStatus: "active",
      }),
    ).toBe(true);
    expect(
      paymentCanRestoreCurrentContract({
        ...currentPayment,
        subscriptionStatus: "cancelled",
      }),
    ).toBe(false);
  });

  it("rejects delayed and duplicate historical payments", () => {
    for (const dueAt of [
      new Date("2026-07-26T00:00:00.000Z"),
      currentPayment.currentPeriodStart,
    ]) {
      expect(
        paymentCanRestoreCurrentContract({ ...currentPayment, dueAt }),
      ).toBe(false);
    }
  });

  it("rejects recovery with mismatched value or provider identity", () => {
    expect(
      paymentCanRestoreCurrentContract({
        ...currentPayment,
        amountCents: 39_700,
      }),
    ).toBe(false);
    expect(
      paymentCanRestoreCurrentContract({
        ...currentPayment,
        providerSubscriptionId: "sub_old",
      }),
    ).toBe(false);
  });

  it("never enters grace after cancellation, expiry, or Free fallback", () => {
    const current = {
      currentPeriodEnd: new Date("2026-09-26T00:00:00.000Z"),
      currentPeriodStart: new Date("2026-08-26T00:00:00.000Z"),
      provider: "asaas",
      providerSubscriptionId: "sub_current",
      providerLifecycleObservedAt: new Date("2026-08-26T12:00:00.000Z"),
      status: "active" as const,
    };
    expect(subscriptionCanEnterGrace(current, {})).toBe(true);
    for (const status of ["cancelled", "expired"] as const) {
      expect(subscriptionCanEnterGrace({ ...current, status }, {})).toBe(false);
    }
    expect(
      subscriptionCanEnterGrace(
        { ...current, currentPeriodEnd: null, currentPeriodStart: null },
        {},
      ),
    ).toBe(false);
    expect(currentPlanItemGrantsPaidAccess({ unitAmountCents: 0 })).toBe(false);
    expect(currentPlanItemGrantsPaidAccess({ unitAmountCents: 19_700 })).toBe(
      true,
    );
  });

  it("does not let a delayed overdue event advance a newer watermark", () => {
    const current = {
      currentPeriodEnd: new Date("2026-09-26T00:00:00.000Z"),
      currentPeriodStart: new Date("2026-08-26T00:00:00.000Z"),
      provider: "asaas",
      providerLifecycleObservedAt: new Date("2026-08-27T12:00:00.000Z"),
      providerSubscriptionId: "sub_current",
      status: "active" as const,
    };
    expect(
      subscriptionCanEnterGrace(current, {
        expectedProvider: "asaas",
        expectedProviderSubscriptionId: "sub_current",
        providerLifecycleObservedAt: new Date("2026-08-26T12:00:00.000Z"),
      }),
    ).toBe(false);
    expect(
      subscriptionCanEnterGrace(current, {
        expectedProvider: "asaas",
        expectedProviderSubscriptionId: "sub_current",
        providerLifecycleObservedAt: null,
      }),
    ).toBe(false);
    expect(
      subscriptionCanEnterGrace(current, {
        expectedProvider: "asaas",
        expectedProviderSubscriptionId: "sub_current",
        providerLifecycleObservedAt: new Date("2026-08-28T12:00:00.000Z"),
      }),
    ).toBe(true);
  });

  it("accepts only current exact overdue provider evidence", () => {
    const overdue = {
      currentPeriodEnd: new Date("2026-09-26T00:00:00.000Z"),
      currentPeriodStart: new Date("2026-08-26T00:00:00.000Z"),
      dueAt: new Date("2026-09-26T00:00:00.000Z"),
      provider: "asaas",
      providerSubscriptionId: "sub_current",
      status: "active" as const,
      subscriptionProvider: "asaas",
      subscriptionProviderId: "sub_current",
    };
    expect(overdueEvidenceCanEnterGrace(overdue)).toBe(true);
    for (const status of ["cancelled", "expired"] as const) {
      expect(overdueEvidenceCanEnterGrace({ ...overdue, status })).toBe(false);
    }
    expect(
      overdueEvidenceCanEnterGrace({
        ...overdue,
        providerSubscriptionId: "sub_old",
      }),
    ).toBe(false);
  });

  it("lets only overdue charges inside the current period block recovery", () => {
    const start = new Date("2026-08-26T00:00:00.000Z");
    const end = new Date("2026-09-26T00:00:00.000Z");
    expect(overdueFallsWithinCurrentPeriod(end, start, end)).toBe(true);
    expect(
      overdueFallsWithinCurrentPeriod(
        new Date("2026-10-26T00:00:00.000Z"),
        start,
        end,
      ),
    ).toBe(false);
  });

  it("does not expose future plan items as the current contract", () => {
    const now = new Date("2026-08-26T12:00:00.000Z");
    expect(
      planItemIsEffectiveAt(
        {
          endsAt: null,
          startsAt: new Date("2026-09-01T00:00:00.000Z"),
        },
        now,
      ),
    ).toBe(false);
    expect(
      planItemIsEffectiveAt(
        {
          endsAt: null,
          startsAt: new Date("2026-08-01T00:00:00.000Z"),
        },
        now,
      ),
    ).toBe(true);
  });

  it("binds a scheduled recurrence once and rejects rebinding", () => {
    const current = {
      currentProvider: "asaas",
      currentProviderSubscriptionId: null,
      currentStatus: "active" as const,
      incomingProvider: "asaas",
      incomingProviderSubscriptionId: "sub_new",
    };
    expect(providerSubscriptionCanBind(current)).toBe(true);
    expect(
      providerSubscriptionCanBind({
        ...current,
        currentProviderSubscriptionId: "sub_new",
      }),
    ).toBe(true);
    expect(
      providerSubscriptionCanBind({
        ...current,
        currentProviderSubscriptionId: "sub_other",
      }),
    ).toBe(false);
    expect(
      providerSubscriptionCanBind({ ...current, currentStatus: "cancelled" }),
    ).toBe(false);
  });

  it("advances renewal beyond the first paid due-date boundary", () => {
    const first = renewedBillingPeriod(
      {
        currentPeriodEnd: new Date("2026-09-26T00:00:00.000Z"),
        currentPeriodStart: new Date("2026-08-26T00:00:00.000Z"),
      },
      new Date("2026-09-26T00:00:00.000Z"),
    );
    expect(first).toEqual({
      currentPeriodEnd: new Date("2026-10-26T00:00:00.000Z"),
      currentPeriodStart: new Date("2026-09-26T00:00:00.000Z"),
    });
    expect(
      renewedBillingPeriod(first, new Date("2026-10-26T00:00:00.000Z")),
    ).toEqual({
      currentPeriodEnd: new Date("2026-11-26T00:00:00.000Z"),
      currentPeriodStart: new Date("2026-10-26T00:00:00.000Z"),
    });
  });
});
