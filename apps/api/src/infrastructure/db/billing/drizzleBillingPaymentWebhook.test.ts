import * as productSchema from "@lojaveiculosv2/db";
import { drizzle } from "drizzle-orm/postgres-js";
import { describe, expect, it } from "vitest";
import {
  billingProviderPaymentUpsertQuery,
  nextPaymentStatus,
} from "./drizzleBillingPaymentWebhook.js";
import {
  refundedHireDecision,
  refundAffectsEffectiveContract,
  refundRequiresGrace,
} from "./drizzleBillingRefundHandling.js";

describe("billing payment webhook lifecycle", () => {
  it("encodes provider timestamps in the payment conflict update", () => {
    const paidAt = new Date("2026-08-27T12:47:13.000Z");
    const query = billingProviderPaymentUpsertQuery(
      drizzle.mock({ schema: productSchema }),
      {
        amountCents: 19700,
        dueAt: new Date("2026-09-27T00:00:00.000Z"),
        externalReference: "hire_1",
        invoiceUrl: null,
        paidAt,
        provider: "asaas",
        providerCheckoutId: "checkout_1",
        providerCustomerId: "customer_1",
        providerEventId: "event_1",
        providerPaymentId: "payment_1",
        providerSubscriptionId: "subscription_provider_1",
        raw: {},
        status: "paid",
      },
      {
        hireId: "hire_1",
        storeId: "00000000-0000-4000-8000-000000000002" as never,
        subscriptionId: "00000000-0000-4000-8000-000000000003",
        tenantId: "00000000-0000-4000-8000-000000000001" as never,
      },
    ).toSQL();

    expect(query.params.some((parameter) => parameter instanceof Date)).toBe(
      false,
    );
    expect(query.params).toContain(paidAt.toISOString());
  });

  it("makes a refund terminal and prevents stale overdue from regressing paid", () => {
    expect(nextPaymentStatus("paid", "overdue")).toBe("paid");
    expect(nextPaymentStatus("paid", "refunded")).toBe("refunded");
    expect(nextPaymentStatus("refunded", "paid")).toBe("refunded");
    expect(nextPaymentStatus("refunded", "overdue")).toBe("refunded");
  });

  it("converges concurrent paid, overdue, and refund observations safely", () => {
    const settle = (observations: Array<"overdue" | "paid" | "refunded">) =>
      observations.reduce(nextPaymentStatus, null);

    expect(settle(["overdue", "paid"])).toBe("paid");
    expect(settle(["paid", "overdue"])).toBe("paid");
    expect(settle(["paid", "refunded"])).toBe("refunded");
    expect(settle(["refunded", "paid"])).toBe("refunded");
  });

  it("moves a refunded active hire to explicit reconciliation and grace", () => {
    const now = new Date("2026-08-26T12:00:00.000Z");

    expect(
      refundedHireDecision(
        {
          effectiveAt: new Date("2026-08-01T00:00:00.000Z"),
          effectiveSubscriptionItemId: "item_paid",
          status: "paid_active",
        },
        now,
      ),
    ).toEqual({
      cancelScheduledPlan: false,
      markReconciliationFailed: true,
    });
    expect(refundRequiresGrace(true)).toBe(true);
  });

  it("cancels a future paid contract when its payment is refunded", () => {
    const now = new Date("2026-08-26T12:00:00.000Z");

    expect(
      refundedHireDecision(
        {
          effectiveAt: new Date("2026-09-01T00:00:00.000Z"),
          effectiveSubscriptionItemId: "item_scheduled",
          status: "activation_pending",
        },
        now,
      ),
    ).toEqual({
      cancelScheduledPlan: true,
      markReconciliationFailed: true,
    });
    expect(refundRequiresGrace(false)).toBe(false);
  });

  it("does not degrade the current contract for a historical refund", () => {
    expect(
      refundAffectsEffectiveContract({
        currentPeriodEnd: new Date("2026-09-01T00:00:00.000Z"),
        currentPeriodStart: new Date("2026-08-01T00:00:00.000Z"),
        effectiveItemId: "item_current",
        hireEffectiveItemId: "item_previous",
        paymentOccurredAt: new Date("2026-07-01T00:00:00.000Z"),
      }),
    ).toBe(false);
    expect(
      refundAffectsEffectiveContract({
        currentPeriodEnd: new Date("2026-09-01T00:00:00.000Z"),
        currentPeriodStart: new Date("2026-08-01T00:00:00.000Z"),
        effectiveItemId: "item_current",
        hireEffectiveItemId: "item_current",
        paymentOccurredAt: new Date("2026-07-01T00:00:00.000Z"),
      }),
    ).toBe(false);
  });

  it("degrades only the matching effective contract in the current period", () => {
    expect(
      refundAffectsEffectiveContract({
        currentPeriodEnd: new Date("2026-09-01T00:00:00.000Z"),
        currentPeriodStart: new Date("2026-08-01T00:00:00.000Z"),
        effectiveItemId: "item_current",
        hireEffectiveItemId: "item_current",
        paymentOccurredAt: new Date("2026-08-15T00:00:00.000Z"),
      }),
    ).toBe(true);
    expect(
      refundAffectsEffectiveContract({
        currentPeriodEnd: new Date("2026-09-01T14:00:00.000Z"),
        currentPeriodStart: new Date("2026-08-01T14:00:00.000Z"),
        effectiveItemId: "item_current",
        hireEffectiveItemId: "item_current",
        paymentOccurredAt: new Date("2026-08-01T00:00:00.000Z"),
      }),
    ).toBe(true);
  });
});
