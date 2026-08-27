import type { AuditEvent } from "@lojaveiculosv2/audit";
import { describe, expect, it, vi } from "vitest";
import type {
  BillingAuditOutboxLease,
  BillingAuditOutboxRepository,
} from "../domains/billing/ports/billingAuditOutbox.js";
import { createServiceContext } from "../shared/serviceContext.js";
import { deliverBillingAuditOutbox } from "./billingAuditOutboxDelivery.js";

describe("billing audit outbox delivery", () => {
  it("retains committed audit intent for retry when the audit DB is unavailable", async () => {
    const repository = fakeRepository([lease({ attemptCount: 1 })]);
    const audit = {
      record: vi.fn(async () => Promise.reject(new Error("down"))),
    };
    const result = await deliverBillingAuditOutbox({
      audit,
      batchSize: 10,
      context: workerContext(),
      leaseDurationMs: 30_000,
      maxAttempts: 3,
      now: new Date("2026-08-26T12:00:00.000Z"),
      repository,
    });
    expect(result).toEqual({
      claimed: 1,
      deadLettered: 0,
      delivered: 0,
      retried: 1,
    });
    expect(repository.scheduleRetry).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: "audit_sink_unavailable" }),
    );
    expect(repository.markDeadLetter).not.toHaveBeenCalled();
  });

  it("dead-letters a bounded terminal delivery failure", async () => {
    const repository = fakeRepository([lease({ attemptCount: 3 })]);
    const result = await deliverBillingAuditOutbox({
      audit: { record: vi.fn(async () => Promise.reject(new Error("down"))) },
      batchSize: 10,
      context: workerContext(),
      leaseDurationMs: 30_000,
      maxAttempts: 3,
      repository,
    });
    expect(result.deadLettered).toBe(1);
    expect(repository.markDeadLetter).toHaveBeenCalledOnce();
    expect(repository.scheduleRetry).not.toHaveBeenCalled();
  });

  it("reuses the persisted audit id so sink retries are idempotent", async () => {
    const seen = new Set<string>();
    const events: AuditEvent[] = [];
    const audit = {
      async record(event: AuditEvent) {
        if (!event.id || seen.has(event.id)) return;
        seen.add(event.id);
        events.push(event);
      },
    };
    const record = lease();
    for (let delivery = 0; delivery < 2; delivery += 1) {
      await deliverBillingAuditOutbox({
        audit,
        batchSize: 1,
        context: workerContext(),
        leaseDurationMs: 30_000,
        maxAttempts: 3,
        repository: fakeRepository([record]),
      });
    }
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      actor: { id: "user_1", kind: "user" },
      id: record.auditId,
      metadata: { planId: "plan_1", status: "created" },
    });
  });

  it("delivers the paid activation action with its canonical summary", async () => {
    const record = lease({ action: "billing.plan_hire.activated" });
    const audit = { record: vi.fn(async (_event: AuditEvent) => undefined) };
    await deliverBillingAuditOutbox({
      audit,
      batchSize: 1,
      context: workerContext(),
      leaseDurationMs: 30_000,
      maxAttempts: 3,
      repository: fakeRepository([record]),
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "billing.plan_hire.activated",
        summary: "Activated paid billing plan hire",
      }),
    );
  });
});

function fakeRepository(
  records: readonly BillingAuditOutboxLease[],
): BillingAuditOutboxRepository {
  return {
    claimBatch: vi.fn(async () => records),
    markDeadLetter: vi.fn(async () => true),
    markDelivered: vi.fn(async () => true),
    scheduleRetry: vi.fn(async () => true),
  };
}

function lease(
  overrides: Partial<BillingAuditOutboxLease> = {},
): BillingAuditOutboxLease {
  return {
    action: "billing.plan_hire.created",
    actorId: "user_1",
    actorKind: "user",
    attemptCount: 1,
    auditId: "00000000-0000-5000-8000-000000000002",
    entityId: "00000000-0000-4000-8000-000000000003",
    entityType: "billing_plan_hire",
    id: "00000000-0000-4000-8000-000000000001",
    leaseToken: "lease_1",
    metadata: { planId: "plan_1", status: "created" },
    occurredAt: new Date("2026-08-26T11:59:00.000Z"),
    requestId: "request_1",
    storeId: "00000000-0000-4000-8000-000000000004",
    tenantId: "00000000-0000-4000-8000-000000000005",
    ...overrides,
  };
}

function workerContext() {
  return createServiceContext({
    actor: { id: "billing_audit_outbox", kind: "system" },
    permissions: ["billing.manage"],
    request: { requestId: "worker_request_1" },
    source: { component: "billing-audit-outbox", service: "api" },
  });
}
