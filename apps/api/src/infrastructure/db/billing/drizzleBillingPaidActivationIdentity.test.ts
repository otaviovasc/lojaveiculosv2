import { describe, expect, it, vi } from "vitest";
import type { UpsertBillingProviderPaymentInput } from "../../../domains/billing/ports/billingWebhookRepository.js";
import {
  activationPaymentCanBind,
  bindPaidActiveProviderIdentity,
  hasRealProviderSubscriptionId,
  identityCanBind,
  stageActivationPendingProviderIdentity,
} from "./drizzleBillingPaidActivationIdentity.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

describe("paid activation provider identity", () => {
  it("binds activation payment identity once", () => {
    expect(activationPaymentCanBind(null, "pay_1")).toBe(true);
    expect(activationPaymentCanBind("pay_1", "pay_1")).toBe(true);
    expect(activationPaymentCanBind("pay_original", "pay_other")).toBe(false);
  });

  it("keeps confirmed payment pending until a real subscription id exists", async () => {
    expect(hasRealProviderSubscriptionId(null)).toBe(false);
    expect(hasRealProviderSubscriptionId("local_subscription")).toBe(false);
    expect(hasRealProviderSubscriptionId("sub_real")).toBe(true);

    const sets: unknown[] = [];
    const transitions: unknown[] = [];
    const db = {
      insert: vi.fn(() => ({
        values: vi.fn(async (value: unknown) => transitions.push(value)),
      })),
      update: vi.fn(() => ({
        set: vi.fn((value: unknown) => {
          sets.push(value);
          return {
            where: vi.fn(() => ({
              returning: vi.fn(async () => [{ id: "hire_1" }]),
            })),
          };
        }),
      })),
    } as unknown as DrizzleBillingClient;
    await expect(
      stageActivationPendingProviderIdentity(db, hire(), payment(null)),
    ).resolves.toBe(true);
    expect(sets).toContainEqual(
      expect.objectContaining({
        providerPaymentId: "pay_1",
        status: "activation_pending",
      }),
    );
    expect(transitions).toContainEqual(
      expect.objectContaining({ toStatus: "activation_pending" }),
    );
  });

  it("does not overwrite a conflicting pending activation payment", async () => {
    const update = vi.fn();
    const db = { update } as unknown as DrizzleBillingClient;
    await expect(
      stageActivationPendingProviderIdentity(
        db,
        hire("payment_pending", "pay_original"),
        payment(null),
      ),
    ).resolves.toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("binds a later exact provider identity to paid hire and subscription", async () => {
    expect(identityCanBind(null, "sub_real")).toBe(true);
    expect(identityCanBind("sub_real", "sub_real")).toBe(true);
    expect(identityCanBind("sub_other", "sub_real")).toBe(false);
    const sets: unknown[] = [];
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [
              { provider: "asaas", providerSubscriptionId: null },
            ]),
          })),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn((value: unknown) => {
          sets.push(value);
          return {
            where: vi.fn(() => ({
              returning: vi.fn(async () => [{ id: "bound" }]),
            })),
          };
        }),
      })),
    } as unknown as DrizzleBillingClient;

    await expect(
      bindPaidActiveProviderIdentity(
        db,
        hire("paid_active"),
        payment("sub_real"),
      ),
    ).resolves.toBe(true);
    expect(sets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ providerSubscriptionId: "sub_real" }),
        expect.objectContaining({
          providerPaymentId: "pay_1",
          providerSubscriptionId: "sub_real",
        }),
      ]),
    );
  });
});

function hire(
  status: "paid_active" | "payment_pending" = "payment_pending",
  providerPaymentId: string | null = null,
) {
  return {
    catalogVersion: "2026-08-v3",
    id: "00000000-0000-4000-8000-000000000001",
    planId: "00000000-0000-4000-8000-000000000002",
    providerSubscriptionId: null,
    providerPaymentId,
    quotedCents: 19_700,
    status,
    storeId: "00000000-0000-4000-8000-000000000003",
    subscriptionId: "00000000-0000-4000-8000-000000000004",
    tenantId: "00000000-0000-4000-8000-000000000005",
  } as never;
}

function payment(
  providerSubscriptionId: string | null,
): UpsertBillingProviderPaymentInput {
  return {
    amountCents: 19_700,
    dueAt: new Date("2026-08-26T00:00:00.000Z"),
    externalReference: "00000000-0000-4000-8000-000000000001",
    invoiceUrl: null,
    paidAt: new Date("2026-08-26T12:00:00.000Z"),
    provider: "asaas",
    providerCustomerId: "cus_1",
    providerPaymentId: "pay_1",
    providerEventId: "evt_1",
    providerSubscriptionId,
    raw: {},
    status: "paid",
  };
}
