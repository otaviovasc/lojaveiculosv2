import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { createDrizzleBillingProductEventOutbox } from "./drizzleBillingProductEventOutbox.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

describe("Drizzle billing product-event outbox", () => {
  it("claims a bounded due batch with skip-locked leases", async () => {
    let statement: unknown;
    const execute = vi.fn(async (value: unknown) => {
      statement = value;
      return [rawEvent()];
    });
    const repository = createDrizzleBillingProductEventOutbox({
      execute,
    } as unknown as DrizzleBillingClient);
    const events = await repository.claimBatch({
      leaseDurationMs: 30_000,
      limit: 50,
      now: new Date("2026-08-25T12:00:00.000Z"),
    });
    const query = new PgDialect().sqlToQuery(statement as SQL);
    expect(query.sql).toContain("for update skip locked");
    expect(query.sql).toContain("lease_expires_at");
    expect(query.sql).toContain("attempt_count = outbox.attempt_count + 1");
    expect(query.params).toContain(50);
    expect(events[0]).toMatchObject({
      attemptCount: 1,
      id: "00000000-0000-4000-8000-000000000001",
      leaseToken: "lease_1",
    });
  });

  it("requires the active lease token when acknowledging delivery", async () => {
    let statement: unknown;
    const execute = vi.fn(async (value: unknown) => {
      statement = value;
      return [];
    });
    const repository = createDrizzleBillingProductEventOutbox({
      execute,
    } as unknown as DrizzleBillingClient);
    await expect(
      repository.markDelivered({
        deliveredAt: new Date("2026-08-25T12:00:00.000Z"),
        eventId: "00000000-0000-4000-8000-000000000001",
        leaseToken: "stale_lease",
      }),
    ).resolves.toBe(false);
    const query = new PgDialect().sqlToQuery(statement as SQL);
    expect(query.sql).toContain("lease_token =");
    expect(query.params).toContain("stale_lease");
  });

  it("requeues only a tenant-scoped terminal failure and starts a new attempt cycle", async () => {
    const statements: unknown[] = [];
    const execute = vi.fn(async (value: unknown) => {
      statements.push(value);
      return [
        {
          event_name: "contract_activated",
          requeue_count: 2,
          store_id: "00000000-0000-4000-8000-000000000003",
        },
      ];
    });
    const repository = createDrizzleBillingProductEventOutbox({
      transaction: async (callback: (tx: unknown) => unknown) =>
        callback({ execute }),
    } as unknown as DrizzleBillingClient);
    await expect(
      repository.requeueFailed({
        eventId: "00000000-0000-4000-8000-000000000001",
        now: new Date("2026-08-25T12:00:00.000Z"),
        tenantId: "00000000-0000-4000-8000-000000000002",
      }),
    ).resolves.toEqual({
      eventName: "contract_activated",
      kind: "requeued",
      requeueCount: 2,
      storeId: "00000000-0000-4000-8000-000000000003",
    });
    const query = new PgDialect().sqlToQuery(statements[0] as SQL);
    expect(query.sql).toContain("tenant_id =");
    expect(query.sql).toContain("status = 'failed'");
    expect(query.sql).toContain("attempt_count = 0");
    expect(query.sql).toContain("requeue_count = requeue_count + 1");
  });
});

function rawEvent() {
  return {
    attempt_count: 1,
    event_name: "contract_activated",
    hire_id: null,
    id: "00000000-0000-4000-8000-000000000001",
    idempotency_key: "event-key-1",
    lease_token: "lease_1",
    occurred_at: "2026-08-25T11:59:00.000Z",
    properties: {},
    provider_checkout_id: null,
    provider_event_id: null,
    provider_payment_id: null,
    provider_subscription_id: null,
    request_id: null,
    store_id: null,
    tenant_id: "00000000-0000-4000-8000-000000000002",
  };
}
