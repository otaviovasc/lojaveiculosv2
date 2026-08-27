import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { createDrizzleBillingAuditOutbox } from "./drizzleBillingAuditOutbox.js";
import {
  deterministicBillingAuditId,
  enqueueBillingAudit,
  sanitizeBillingAuditMetadata,
} from "./drizzleBillingAuditOutboxMutation.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

describe("Drizzle billing audit outbox", () => {
  it("claims due and stale leases concurrently with skip locked", async () => {
    let statement: unknown;
    const repository = createDrizzleBillingAuditOutbox({
      execute: vi.fn(async (value: unknown) => {
        statement = value;
        return [rawLease()];
      }),
    } as unknown as DrizzleBillingClient);
    const records = await repository.claimBatch({
      leaseDurationMs: 30_000,
      limit: 25,
      now: new Date("2026-08-26T12:00:00.000Z"),
    });
    const query = new PgDialect().sqlToQuery(statement as SQL);
    expect(query.sql).toContain("state in ('pending', 'delivering')");
    expect(query.sql).toContain("for update skip locked");
    expect(query.sql).toContain("lease_expires_at <=");
    expect(query.params).toContain(25);
    expect(records[0]).toMatchObject({
      action: "billing.plan_hire.created",
      attemptCount: 1,
      leaseToken: "lease_1",
    });
  });

  it("uses lease CAS for acknowledgements", async () => {
    let statement: unknown;
    const repository = createDrizzleBillingAuditOutbox({
      execute: vi.fn(async (value: unknown) => {
        statement = value;
        return [];
      }),
    } as unknown as DrizzleBillingClient);
    await expect(
      repository.markDelivered({
        deliveredAt: new Date("2026-08-26T12:00:00.000Z"),
        eventId: "00000000-0000-4000-8000-000000000001",
        leaseToken: "stale_lease",
      }),
    ).resolves.toBe(false);
    const query = new PgDialect().sqlToQuery(statement as SQL);
    expect(query.sql).toContain("state = 'delivering'");
    expect(query.sql).toContain("lease_token =");
    expect(query.params).toContain("stale_lease");
  });

  it("keeps deterministic audit ids and rejects unapproved payload fields", () => {
    const first = deterministicBillingAuditId("billing-audit:hire:1:created");
    expect(deterministicBillingAuditId("billing-audit:hire:1:created")).toBe(
      first,
    );
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(() =>
      sanitizeBillingAuditMetadata({ rawProviderPayload: "secret" } as never),
    ).toThrow(/not allowed/i);
    expect(() =>
      sanitizeBillingAuditMetadata({ reason: "x".repeat(192) }),
    ).toThrow(/length/i);
  });

  it("deduplicates a repeated request with the same deterministic audit id", async () => {
    const onConflictDoNothing = vi.fn(async () => undefined);
    const values = vi.fn(() => ({ onConflictDoNothing }));
    const db = {
      insert: vi.fn(() => ({ values })),
    } as unknown as DrizzleBillingClient;
    const input = {
      action: "billing.plan_hire.created",
      audit: { actorId: "user_1", actorKind: "user", requestId: "request_1" },
      entityId: "00000000-0000-4000-8000-000000000003",
      entityType: "billing_plan_hire",
      idempotencyKey: "billing-audit:hire:1:created",
      metadata: { planId: "plan_1", quotedCents: 19_700 },
      storeId: "00000000-0000-4000-8000-000000000004",
      tenantId: "00000000-0000-4000-8000-000000000005",
    } as const;
    await enqueueBillingAudit(db, input);
    await enqueueBillingAudit(db, input);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "billing.plan_hire.created",
        auditId: deterministicBillingAuditId("billing-audit:hire:1:created"),
        metadata: { planId: "plan_1", quotedCents: 19_700 },
      }),
    );
    expect(values.mock.calls[0]).toEqual(values.mock.calls[1]);
    expect(onConflictDoNothing).toHaveBeenCalledTimes(2);
  });
});

function rawLease() {
  return {
    action: "billing.plan_hire.created",
    actor_id: "user_1",
    actor_kind: "user",
    attempt_count: 1,
    audit_id: "00000000-0000-5000-8000-000000000002",
    entity_id: "00000000-0000-4000-8000-000000000003",
    entity_type: "billing_plan_hire",
    id: "00000000-0000-4000-8000-000000000001",
    lease_token: "lease_1",
    metadata: { status: "created" },
    occurred_at: "2026-08-26T11:59:00.000Z",
    request_id: "request_1",
    store_id: "00000000-0000-4000-8000-000000000004",
    tenant_id: "00000000-0000-4000-8000-000000000005",
  };
}
