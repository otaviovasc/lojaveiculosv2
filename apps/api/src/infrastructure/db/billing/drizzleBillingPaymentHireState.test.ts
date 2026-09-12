import { describe, expect, it, vi } from "vitest";
import type { UpsertBillingProviderPaymentInput } from "../../../domains/billing/ports/billingWebhookRepository.js";
import { bindObservedPayment } from "./drizzleBillingPaymentHireState.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

describe("observed payment hire identity fencing", () => {
  it("accepts an exact idempotent payment/subscription binding", async () => {
    const db = updateDatabase([{ id: "hire_1" }]);
    await expect(
      bindObservedPayment(db, scope, payment("sub_exact")),
    ).resolves.toBe(true);
  });

  it("reports reconciliation when a different subscription loses the CAS", async () => {
    const db = updateDatabase([]);
    await expect(
      bindObservedPayment(db, scope, payment("sub_conflicting")),
    ).resolves.toBe(false);
  });
});

function updateDatabase(rows: Array<{ id: string }>) {
  return {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({ returning: vi.fn(async () => rows) })),
      })),
    })),
  } as unknown as DrizzleBillingClient;
}

function payment(
  providerSubscriptionId: string,
): UpsertBillingProviderPaymentInput {
  return {
    amountCents: 19_700,
    dueAt: new Date("2026-09-26T00:00:00.000Z"),
    externalReference: "00000000-0000-4000-8000-000000000001",
    invoiceUrl: null,
    paidAt: null,
    provider: "asaas",
    providerCustomerId: "customer_1",
    providerEventId: "event_1",
    providerPaymentId: "payment_exact",
    providerSubscriptionId,
    raw: {},
    status: "pending",
  };
}

const scope = {
  hireId: "00000000-0000-4000-8000-000000000001",
  storeId: "00000000-0000-4000-8000-000000000002",
  subscriptionId: "00000000-0000-4000-8000-000000000003",
  tenantId: "00000000-0000-4000-8000-000000000004",
};
