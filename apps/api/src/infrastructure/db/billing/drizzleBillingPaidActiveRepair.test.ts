import { describe, expect, it, vi } from "vitest";
import type { UpsertBillingProviderPaymentInput } from "../../../domains/billing/ports/billingWebhookRepository.js";
import { repairPaidActiveProviderIdentity } from "./drizzleBillingPaidActiveRepair.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

describe("paid active provider identity repair", () => {
  it("binds missing customer and subscription identities before auditing", async () => {
    const updates: unknown[] = [];
    const inserts: unknown[] = [];
    const db = database([null, null], updates, inserts);

    await expect(
      repairPaidActiveProviderIdentity(db, repairInput("customer_real")),
    ).resolves.toBe(true);
    expect(updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ providerCustomerId: "customer_real" }),
        expect.objectContaining({
          providerSubscriptionId: "subscription_real",
        }),
      ]),
    );
    expect(inserts).toContainEqual(
      expect.objectContaining({ action: "billing.plan_hire.activated" }),
    );
  });

  it("leaves provider identities untouched when customer identity conflicts", async () => {
    const updates: unknown[] = [];
    const inserts: unknown[] = [];
    const db = database(["customer_other"], updates, inserts);

    await expect(
      repairPaidActiveProviderIdentity(db, repairInput("customer_real")),
    ).resolves.toBe(false);
    expect(updates).toEqual([]);
    expect(inserts).toEqual([]);
  });

  it("preserves the original activation payment during a paid renewal", async () => {
    const updates: unknown[] = [];
    const inserts: unknown[] = [];
    const db = database([null, null], updates, inserts);

    await expect(
      repairPaidActiveProviderIdentity(
        db,
        repairInput("customer_real", "payment_activation", "payment_renewal"),
      ),
    ).resolves.toBe(true);
    expect(updates).toContainEqual(
      expect.objectContaining({ providerPaymentId: "payment_activation" }),
    );
    expect(updates).not.toContainEqual(
      expect.objectContaining({ providerPaymentId: "payment_renewal" }),
    );
  });
});

function database(
  selectedIdentities: (string | null)[],
  updates: unknown[],
  inserts: unknown[],
) {
  let selectCount = 0;
  return {
    insert: vi.fn(() => ({
      values: vi.fn((value: unknown) => {
        inserts.push(value);
        return { onConflictDoNothing: vi.fn(async () => undefined) };
      }),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => {
        const selected = selectedIdentities[selectCount++];
        const result =
          selectCount === 1
            ? {
                billingCustomerId: "customer_local",
                providerCustomerId: selected,
              }
            : { provider: "asaas", providerSubscriptionId: selected };
        const terminal = {
          where: vi.fn(() => ({ limit: vi.fn(async () => [result]) })),
        };
        return { ...terminal, innerJoin: vi.fn(() => terminal) };
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((value: unknown) => {
        updates.push(value);
        return {
          where: vi.fn(() => ({
            returning: vi.fn(async () => [{ id: "bound" }]),
          })),
        };
      }),
    })),
  } as unknown as DrizzleBillingClient;
}

function repairInput(
  providerCustomerId: string,
  activationPaymentId: string | null = null,
  observedPaymentId = "payment_1",
) {
  return {
    hire: {
      catalogVersion: "2026-08-v3",
      id: "00000000-0000-4000-8000-000000000001",
      planId: "00000000-0000-4000-8000-000000000002",
      providerSubscriptionId: null,
      providerPaymentId: activationPaymentId,
      quotedCents: 19_700,
      status: "paid_active",
      storeId: "00000000-0000-4000-8000-000000000003",
      subscriptionId: "00000000-0000-4000-8000-000000000004",
      tenantId: "00000000-0000-4000-8000-000000000005",
    } as never,
    observation: payment(providerCustomerId, observedPaymentId),
    observedAt: new Date("2026-08-26T12:00:00.000Z"),
    paymentId: "00000000-0000-4000-8000-000000000006",
  };
}

function payment(
  providerCustomerId: string,
  providerPaymentId: string,
): UpsertBillingProviderPaymentInput {
  return {
    amountCents: 19_700,
    dueAt: new Date("2026-08-26T00:00:00.000Z"),
    externalReference: "00000000-0000-4000-8000-000000000001",
    invoiceUrl: null,
    paidAt: new Date("2026-08-26T12:00:00.000Z"),
    provider: "asaas",
    providerCustomerId,
    providerEventId: "event_1",
    providerPaymentId,
    providerSubscriptionId: "subscription_real",
    raw: {},
    status: "paid",
  };
}
