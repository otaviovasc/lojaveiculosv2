import { describe, expect, it, vi } from "vitest";
import type { BillingProductEventOutboxRepository } from "../../ports/billingProductEventDelivery.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { requeueBillingProductEvent } from "./requeueBillingProductEvent.js";

describe("requeueBillingProductEvent", () => {
  it("is tenant-scoped, audited, and idempotent for an already pending event", async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const repository = fakeRepository();
    repository.requeueFailed = vi.fn(async () => ({
      kind: "already_pending" as const,
    }));
    const result = await requeueBillingProductEvent(
      createServiceContext({
        actor: { id: "operator", kind: "system" },
        audit,
        permissions: ["billing.manage"],
        request: { requestId: "request_1" },
        tenantId: "tenant_1",
      }),
      { eventId: "event_1", now: new Date("2026-08-25T12:00:00Z") },
      repository,
    );
    expect(result).toEqual({ kind: "already_pending" });
    expect(repository.requeueFailed).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: "event_1", tenantId: "tenant_1" }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "billing.product_event.requeue",
        outcome: "succeeded",
        tenantId: "tenant_1",
      }),
    );
  });

  it("rejects a processed event after recording the failed operator action", async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const repository = fakeRepository();
    repository.requeueFailed = vi.fn(async () => ({
      kind: "not_requeueable" as const,
    }));
    await expect(
      requeueBillingProductEvent(
        createServiceContext({
          actor: { id: "operator", kind: "system" },
          audit,
          permissions: ["billing.manage"],
          request: { requestId: "request_1" },
          tenantId: "tenant_1",
        }),
        { eventId: "event_1" },
        repository,
      ),
    ).rejects.toMatchObject({
      code: "BILLING_PRODUCT_EVENT_NOT_REQUEUEABLE",
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "failed" }),
    );
  });
});

function fakeRepository(): BillingProductEventOutboxRepository {
  return {
    claimBatch: vi.fn(async () => []),
    markDelivered: vi.fn(async () => true),
    markFailed: vi.fn(async () => true),
    requeueFailed: vi.fn(async () => ({ kind: "not_found" as const })),
    scheduleRetry: vi.fn(async () => true),
    snapshot: vi.fn(async () => ({
      failedCount: 0,
      oldestPendingAgeSeconds: 0,
      pendingCount: 0,
      requeueCount: 0,
      retryingCount: 0,
    })),
  };
}
