import { describe, expect, it, vi } from "vitest";
import type { UpsertBillingProviderPaymentInput } from "../../../domains/billing/ports/billingWebhookRepository.js";
import { bindPaidPlanProviderCustomer } from "./drizzleBillingPaidPlanIdentity.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

describe("paid plan provider customer binding", () => {
  it("binds a previously missing provider customer identity", async () => {
    const updates: unknown[] = [];
    const db = database({ providerCustomerId: null }, updates);

    await expect(
      bindPaidPlanProviderCustomer(
        db,
        "00000000-0000-4000-8000-000000000001",
        "00000000-0000-4000-8000-000000000002",
        "00000000-0000-4000-8000-000000000003",
        payment("customer_real"),
        new Date("2026-08-26T12:00:00.000Z"),
      ),
    ).resolves.toBe(true);
    expect(updates).toContainEqual(
      expect.objectContaining({ providerCustomerId: "customer_real" }),
    );
  });

  it("rejects a conflicting customer identity without mutation", async () => {
    const updates: unknown[] = [];
    const db = database({ providerCustomerId: "customer_other" }, updates);

    await expect(
      bindPaidPlanProviderCustomer(
        db,
        "00000000-0000-4000-8000-000000000001",
        "00000000-0000-4000-8000-000000000002",
        "00000000-0000-4000-8000-000000000003",
        payment("customer_real"),
        new Date("2026-08-26T12:00:00.000Z"),
      ),
    ).resolves.toBe(false);
    expect(updates).toEqual([]);
  });
});

function database(
  customer: { providerCustomerId: string | null },
  updates: unknown[],
) {
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [
              { billingCustomerId: "customer_local", ...customer },
            ]),
          })),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn((value: unknown) => {
        updates.push(value);
        return {
          where: vi.fn(() => ({
            returning: vi.fn(async () => [{ id: "customer_local" }]),
          })),
        };
      }),
    })),
  } as unknown as DrizzleBillingClient;
}

function payment(
  providerCustomerId: string,
): UpsertBillingProviderPaymentInput {
  return {
    amountCents: 19_700,
    dueAt: new Date("2026-08-26T00:00:00.000Z"),
    externalReference: "00000000-0000-4000-8000-000000000004",
    invoiceUrl: null,
    paidAt: new Date("2026-08-26T12:00:00.000Z"),
    provider: "asaas",
    providerCustomerId,
    providerEventId: "event_1",
    providerPaymentId: "payment_1",
    providerSubscriptionId: "subscription_real",
    raw: {},
    status: "paid",
  };
}
