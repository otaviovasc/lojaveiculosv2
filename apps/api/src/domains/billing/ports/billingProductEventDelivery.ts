export type BillingProductEventName =
  | "checkout_created"
  | "contract_activated"
  | "free_fallback"
  | "grace_entered"
  | "hire_created"
  | "payment_observed"
  | "provider_bound"
  | "reconciliation_failed";

export type BillingProductEventLease = {
  attemptCount: number;
  eventName: BillingProductEventName;
  hireId: string | null;
  id: string;
  idempotencyKey: string;
  leaseToken: string;
  occurredAt: Date;
  properties: Record<string, boolean | number | string | null>;
  providerCheckoutId: string | null;
  providerEventId: string | null;
  providerPaymentId: string | null;
  providerSubscriptionId: string | null;
  requestId: string | null;
  storeId: string | null;
  tenantId: string;
};

export type BillingProductEventOutboxSnapshot = {
  failedCount: number;
  oldestPendingAgeSeconds: number;
  pendingCount: number;
  requeueCount: number;
  retryingCount: number;
};

export interface BillingProductEventOutboxRepository {
  claimBatch(input: {
    leaseDurationMs: number;
    limit: number;
    now: Date;
  }): Promise<readonly BillingProductEventLease[]>;
  markDelivered(input: {
    deliveredAt: Date;
    eventId: string;
    leaseToken: string;
  }): Promise<boolean>;
  markFailed(input: {
    errorCode: string;
    eventId: string;
    failedAt: Date;
    leaseToken: string;
  }): Promise<boolean>;
  requeueFailed(input: {
    eventId: string;
    now: Date;
    tenantId: string;
  }): Promise<
    | {
        eventName: BillingProductEventName;
        kind: "requeued";
        requeueCount: number;
        storeId: string | null;
      }
    | { kind: "already_pending" | "not_found" | "not_requeueable" }
  >;
  scheduleRetry(input: {
    errorCode: string;
    eventId: string;
    leaseToken: string;
    nextAttemptAt: Date;
    now: Date;
  }): Promise<boolean>;
  snapshot(now: Date): Promise<BillingProductEventOutboxSnapshot>;
}

export interface BillingProductEventSink {
  deliver(
    event: BillingProductEventLease,
  ): Promise<
    | { kind: "delivered" }
    | { errorCode: string; kind: "failed"; retryable: boolean }
  >;
}
