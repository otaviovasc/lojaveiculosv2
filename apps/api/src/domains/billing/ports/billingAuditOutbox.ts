import type { ActorKind } from "../../../shared/serviceContext.js";

export type BillingAuditAction =
  | "billing.plan_hire.activated"
  | "billing.plan_hire.created"
  | "billing.plan_hire.checkout_created"
  | "billing.plan_quote.approved"
  | "billing.plan_quote.requested"
  | "billing.subscription.free_fallback";

export type BillingAuditIntent = Readonly<{
  actorId: string;
  actorKind: ActorKind;
  requestId: string;
}>;

export type BillingAuditMetadata = Readonly<
  Partial<{
    catalogVersion: string;
    paymentId: string;
    planId: string;
    providerCheckoutId: string;
    providerEventId: string;
    providerPaymentId: string;
    providerSubscriptionId: string;
    quoteId: string;
    quotedCents: number;
    reason: string;
    status: string;
    subscriptionId: string;
  }>
>;

export type BillingAuditOutboxLease = Readonly<{
  action: BillingAuditAction;
  actorId: string;
  actorKind: ActorKind;
  attemptCount: number;
  auditId: string;
  entityId: string;
  entityType: "billing_plan_hire" | "billing_plan_quote" | "subscription";
  id: string;
  leaseToken: string;
  metadata: BillingAuditMetadata;
  occurredAt: Date;
  requestId: string;
  storeId: string;
  tenantId: string;
}>;

export interface BillingAuditOutboxRepository {
  claimBatch(input: {
    leaseDurationMs: number;
    limit: number;
    now: Date;
  }): Promise<readonly BillingAuditOutboxLease[]>;
  markDeadLetter(input: {
    errorCode: string;
    eventId: string;
    failedAt: Date;
    leaseToken: string;
  }): Promise<boolean>;
  markDelivered(input: {
    deliveredAt: Date;
    eventId: string;
    leaseToken: string;
  }): Promise<boolean>;
  scheduleRetry(input: {
    errorCode: string;
    eventId: string;
    leaseToken: string;
    nextAttemptAt: Date;
    now: Date;
  }): Promise<boolean>;
}
