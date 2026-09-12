import { describe, expect, it, vi } from "vitest";
import { billingProductEventOutbox } from "@lojaveiculosv2/db";
import {
  billingProductEventNames,
  recordBillingProductEvent,
  sanitizeBillingProductEventProperties,
} from "./drizzleBillingProductEvents.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

describe("billing product events", () => {
  it("keeps an explicit analytics allowlist separate from audit actions", () => {
    expect(billingProductEventNames).toEqual([
      "hire_created",
      "checkout_created",
      "payment_observed",
      "provider_bound",
      "contract_activated",
      "grace_entered",
      "free_fallback",
      "reconciliation_failed",
    ]);
  });

  it("rejects unbounded or sensitive product-event properties", () => {
    expect(() =>
      sanitizeBillingProductEventProperties({ rawPayload: "secret" }),
    ).toThrow(/not allowed/i);
    expect(() =>
      sanitizeBillingProductEventProperties({ reason: "x".repeat(192) }),
    ).toThrow(/too long/i);
  });

  it("accepts only small server-owned commercial dimensions", () => {
    expect(
      sanitizeBillingProductEventProperties({
        catalogVersion: "2026-08-v3",
        planId: "plan_1",
        quotedCents: 19700,
        source: "billing_plan_hire",
      }),
    ).toEqual({
      catalogVersion: "2026-08-v3",
      planId: "plan_1",
      quotedCents: 19700,
      source: "billing_plan_hire",
    });
  });

  it("writes with the global idempotency conflict target supplied by the schema", async () => {
    const onConflictDoNothing = vi.fn(async () => undefined);
    const values = vi.fn(() => ({ onConflictDoNothing }));
    const db = {
      insert: vi.fn(() => ({ values })),
    } as unknown as DrizzleBillingClient;

    await recordBillingProductEvent(db, {
      eventName: "hire_created",
      hireId: "00000000-0000-4000-8000-000000000001",
      idempotencyKey: "billing-hire:1:created",
      properties: { planId: "plan_1" },
      storeId: "00000000-0000-4000-8000-000000000002",
      tenantId: "00000000-0000-4000-8000-000000000003",
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "hire_created",
        idempotencyKey: "billing-hire:1:created",
      }),
    );
    expect(onConflictDoNothing).toHaveBeenCalledWith({
      target: billingProductEventOutbox.idempotencyKey,
    });
  });
});
