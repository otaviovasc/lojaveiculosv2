import { describe, expect, it, vi } from "vitest";
import type {
  BillingProductEventLease,
  BillingProductEventOutboxRepository,
  BillingProductEventSink,
} from "../../domains/billing/ports/billingProductEventDelivery.js";
import { createNoopServiceLogger } from "../../shared/serviceContext.js";
import {
  retryDelayMs,
  runBillingProductEventWorker,
} from "./runBillingProductEventWorker.js";

describe("billing product-event worker", () => {
  it("delivers a bounded claimed batch and acknowledges by lease token", async () => {
    const repository = fakeRepository([event()]);
    const sink: BillingProductEventSink = {
      deliver: vi.fn(async () => ({ kind: "delivered" as const })),
    };
    const result = await runBillingProductEventWorker({
      batchSize: 500,
      leaseDurationMs: 30_000,
      logger: createNoopServiceLogger(),
      maxAttempts: 10,
      now: new Date("2026-08-25T12:00:00.000Z"),
      repository,
      sink,
    });
    expect(result).toEqual({
      claimed: 1,
      delivered: 1,
      failed: 0,
      retried: 0,
      staleLease: 0,
    });
    expect(repository.claimBatch).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 }),
    );
    expect(repository.markDelivered).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: "event_1", leaseToken: "lease_1" }),
    );
  });

  it("retries transient failures without acknowledging delivery", async () => {
    const repository = fakeRepository([event({ attemptCount: 2 })]);
    const result = await runBillingProductEventWorker({
      batchSize: 10,
      leaseDurationMs: 30_000,
      logger: createNoopServiceLogger(),
      maxAttempts: 10,
      now: new Date("2026-08-25T12:00:00.000Z"),
      repository,
      sink: {
        deliver: async () => ({
          errorCode: "http_503",
          kind: "failed",
          retryable: true,
        }),
      },
    });
    expect(result.retried).toBe(1);
    expect(repository.scheduleRetry).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: "http_503",
        nextAttemptAt: new Date("2026-08-25T12:01:00.000Z"),
      }),
    );
    expect(repository.markDelivered).not.toHaveBeenCalled();
  });

  it("retains terminal failures and stops after the configured attempt cap", async () => {
    const repository = fakeRepository([event({ attemptCount: 10 })]);
    const result = await runBillingProductEventWorker({
      batchSize: 10,
      leaseDurationMs: 30_000,
      logger: createNoopServiceLogger(),
      maxAttempts: 10,
      repository,
      sink: {
        deliver: async () => ({
          errorCode: "network_error",
          kind: "failed",
          retryable: true,
        }),
      },
    });
    expect(result.failed).toBe(1);
    expect(repository.markFailed).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: "network_error" }),
    );
  });

  it("caps exponential retry delay at one hour", () => {
    expect(retryDelayMs(1)).toBe(30_000);
    expect(retryDelayMs(2)).toBe(60_000);
    expect(retryDelayMs(99)).toBe(3_600_000);
  });
});

function event(
  overrides: Partial<BillingProductEventLease> = {},
): BillingProductEventLease {
  return {
    attemptCount: 1,
    eventName: "contract_activated",
    hireId: "hire_1",
    id: "event_1",
    idempotencyKey: "billing-hire:1:contract-activated",
    leaseToken: "lease_1",
    occurredAt: new Date("2026-08-25T11:59:00.000Z"),
    properties: { planId: "plan_1" },
    providerCheckoutId: "checkout_1",
    providerEventId: "provider_event_1",
    providerPaymentId: "payment_1",
    providerSubscriptionId: "subscription_1",
    requestId: "request_1",
    storeId: "store_1",
    tenantId: "tenant_1",
    ...overrides,
  };
}

function fakeRepository(
  events: readonly BillingProductEventLease[],
): BillingProductEventOutboxRepository {
  return {
    claimBatch: vi.fn(async () => events),
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
