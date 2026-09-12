import { describe, expect, it, vi } from "vitest";
import {
  bindPlanHireCheckout,
  checkoutIdentityCanBind,
} from "./drizzleBillingPlanHireCheckoutLifecycle.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

describe("plan hire checkout identity binding", () => {
  it("accepts only an unbound provider checkout identity", () => {
    expect(checkoutIdentityCanBind(null)).toBe(true);
    expect(checkoutIdentityCanBind("checkout_existing")).toBe(false);
  });

  it("returns an exact duplicate without another session or mutation", async () => {
    const before = hire("checkout_exact");
    let selectCount = 0;
    const insert = vi.fn();
    const update = vi.fn();
    const tx = {
      insert,
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () =>
              selectCount++ === 0
                ? [before]
                : [{ checkoutUrl: "https://checkout/exact" }],
            ),
          })),
        })),
      })),
      update,
    };
    const db = {
      transaction: vi.fn(async (callback: (value: unknown) => unknown) =>
        callback(tx),
      ),
    } as unknown as DrizzleBillingClient;

    await expect(
      bindPlanHireCheckout(db, bindInput("checkout_exact")),
    ).resolves.toMatchObject({
      checkoutUrl: "https://checkout/exact",
      providerCheckoutId: "checkout_exact",
    });
    expect(update).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects a second provider checkout without mutation", async () => {
    const update = vi.fn();
    const insert = vi.fn();
    const tx = {
      insert,
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [hire("checkout_existing")]),
          })),
        })),
      })),
      update,
    };
    const db = {
      transaction: vi.fn(async (callback: (value: unknown) => unknown) =>
        callback(tx),
      ),
    } as unknown as DrizzleBillingClient;

    await expect(
      bindPlanHireCheckout(db, bindInput("checkout_conflicting")),
    ).rejects.toThrow("identity conflicts");
    expect(update).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
});

function bindInput(providerCheckoutId: string) {
  return {
    audit: { actorId: "user_1", actorKind: "user" as const, requestId: "req" },
    callbackUrls: {},
    checkoutUrl: "https://checkout/new",
    expiresAt: null,
    hireId: "00000000-0000-4000-8000-000000000001",
    providerCheckoutId,
    raw: {},
    storeId: "00000000-0000-4000-8000-000000000002" as never,
    tenantId: "00000000-0000-4000-8000-000000000003" as never,
  };
}

function hire(providerCheckoutId: string) {
  return {
    catalogVersion: "2026-08-v3",
    checkoutMode: "subscription",
    id: "00000000-0000-4000-8000-000000000001",
    planId: "00000000-0000-4000-8000-000000000004",
    planSnapshot: {},
    providerCheckoutId,
    quotedCents: 19_700,
    status: "checkout_created",
    storeId: "00000000-0000-4000-8000-000000000002",
    subscriptionId: "00000000-0000-4000-8000-000000000005",
    tenantId: "00000000-0000-4000-8000-000000000003",
  } as never;
}
