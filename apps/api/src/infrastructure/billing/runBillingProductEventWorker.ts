import type {
  BillingProductEventLease,
  BillingProductEventOutboxRepository,
  BillingProductEventSink,
} from "../../domains/billing/ports/billingProductEventDelivery.js";
import type { ServiceLogger } from "../../shared/serviceContext.js";

export type BillingProductEventWorkerResult = {
  claimed: number;
  delivered: number;
  failed: number;
  retried: number;
  staleLease: number;
};

export async function runBillingProductEventWorker(input: {
  batchSize: number;
  leaseDurationMs: number;
  logger: ServiceLogger;
  maxAttempts: number;
  now?: Date;
  repository: BillingProductEventOutboxRepository;
  sink: BillingProductEventSink;
}): Promise<BillingProductEventWorkerResult> {
  const now = input.now ?? new Date();
  const leases = await input.repository.claimBatch({
    leaseDurationMs: input.leaseDurationMs,
    limit: Math.min(Math.max(input.batchSize, 1), 100),
    now,
  });
  const totals: BillingProductEventWorkerResult = {
    claimed: leases.length,
    delivered: 0,
    failed: 0,
    retried: 0,
    staleLease: 0,
  };
  for (const lease of leases) {
    await processLease(input, lease, now, totals);
  }
  return totals;
}

async function processLease(
  input: Parameters<typeof runBillingProductEventWorker>[0],
  lease: BillingProductEventLease,
  now: Date,
  totals: BillingProductEventWorkerResult,
) {
  const outcome = await input.sink.deliver(lease);
  if (outcome.kind === "delivered") {
    const applied = await input.repository.markDelivered({
      deliveredAt: now,
      eventId: lease.id,
      leaseToken: lease.leaseToken,
    });
    increment(applied, totals, "delivered");
    input.logger.info("billing.product_event.delivered", identifiers(lease));
    return;
  }
  const terminal =
    !outcome.retryable || lease.attemptCount >= input.maxAttempts;
  if (terminal) {
    const applied = await input.repository.markFailed({
      errorCode: outcome.errorCode,
      eventId: lease.id,
      failedAt: now,
      leaseToken: lease.leaseToken,
    });
    increment(applied, totals, "failed");
    input.logger.error("billing.product_event.delivery_failed", {
      ...identifiers(lease),
      attemptCount: lease.attemptCount,
      failureCode: outcome.errorCode,
    });
    return;
  }
  const applied = await input.repository.scheduleRetry({
    errorCode: outcome.errorCode,
    eventId: lease.id,
    leaseToken: lease.leaseToken,
    nextAttemptAt: new Date(now.getTime() + retryDelayMs(lease.attemptCount)),
    now,
  });
  increment(applied, totals, "retried");
  input.logger.warn("billing.product_event.retry_scheduled", {
    ...identifiers(lease),
    attemptCount: lease.attemptCount,
    failureCode: outcome.errorCode,
  });
}

function identifiers(event: BillingProductEventLease) {
  return {
    billingProductEventId: event.id,
    eventName: event.eventName,
    hireId: event.hireId,
    providerCheckoutId: event.providerCheckoutId,
    providerEventId: event.providerEventId,
    providerPaymentId: event.providerPaymentId,
    providerSubscriptionId: event.providerSubscriptionId,
    requestId: event.requestId,
    storeId: event.storeId,
    tenantId: event.tenantId,
  };
}

function increment(
  applied: boolean,
  totals: BillingProductEventWorkerResult,
  counter: "delivered" | "failed" | "retried",
) {
  if (applied) totals[counter] += 1;
  else totals.staleLease += 1;
}

export function retryDelayMs(attemptCount: number): number {
  return Math.min(30_000 * 2 ** Math.max(0, attemptCount - 1), 3_600_000);
}
