import type { billingPlanHires } from "@lojaveiculosv2/db";
import type { UpsertBillingProviderPaymentInput } from "../../../domains/billing/ports/billingWebhookRepository.js";
import type { ActorKind } from "../../../shared/serviceContext.js";
import { enqueueBillingAudit } from "./drizzleBillingAuditOutboxMutation.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { recordBillingProductEvent } from "./drizzleBillingProductEvents.js";

export async function recordPaidActivationAudit(
  db: DrizzleBillingClient,
  input: {
    actorId: string;
    actorKind: ActorKind;
    catalogVersion: string;
    hireId: string;
    occurredAt: Date;
    paymentId: string;
    planId: string;
    providerCheckoutId?: string | null;
    providerEventId?: string | null;
    providerPaymentId?: string | null;
    providerSubscriptionId?: string | null;
    quotedCents: number;
    requestId: string;
    storeId: string;
    tenantId: string;
  },
) {
  await enqueueBillingAudit(db, paidActivationAuditRecord(input));
}

export async function recordObservedPaidActivationAudit(
  db: DrizzleBillingClient,
  input: {
    hire: typeof billingPlanHires.$inferSelect;
    observation: UpsertBillingProviderPaymentInput;
    occurredAt: Date;
    paymentId: string;
  },
) {
  const { hire, observation, occurredAt, paymentId } = input;
  await recordPaidActivationAudit(db, {
    actorId: "asaas_billing_webhook",
    actorKind: "integration",
    catalogVersion: hire.catalogVersion,
    hireId: hire.id,
    occurredAt,
    paymentId,
    planId: hire.planId,
    providerCheckoutId: observation.providerCheckoutId ?? null,
    providerEventId: observation.providerEventId,
    providerPaymentId: observation.providerPaymentId,
    providerSubscriptionId: observation.providerSubscriptionId,
    quotedCents: hire.quotedCents,
    requestId: observation.requestId ?? observation.providerEventId,
    storeId: hire.storeId,
    tenantId: hire.tenantId,
  });
}

export async function recordPaidActivationObservability(
  db: DrizzleBillingClient,
  input: {
    hire: typeof billingPlanHires.$inferSelect;
    observation: UpsertBillingProviderPaymentInput;
    occurredAt: Date;
    paymentId: string;
  },
) {
  const { hire, observation } = input;
  await recordBillingProductEvent(db, {
    eventName: "contract_activated",
    hireId: hire.id,
    idempotencyKey: `billing-hire:${hire.id}:contract-activated`,
    properties: {
      catalogVersion: hire.catalogVersion,
      planId: hire.planId,
      quotedCents: hire.quotedCents,
    },
    providerCheckoutId: observation.providerCheckoutId ?? null,
    providerEventId: observation.providerEventId,
    providerPaymentId: observation.providerPaymentId,
    providerSubscriptionId: observation.providerSubscriptionId,
    storeId: hire.storeId,
    tenantId: hire.tenantId,
  });
  await recordObservedPaidActivationAudit(db, input);
}

export function paidActivationAuditRecord(input: {
  actorId: string;
  actorKind: ActorKind;
  catalogVersion: string;
  hireId: string;
  occurredAt: Date;
  paymentId: string;
  planId: string;
  providerCheckoutId?: string | null;
  providerEventId?: string | null;
  providerPaymentId?: string | null;
  providerSubscriptionId?: string | null;
  quotedCents: number;
  requestId: string;
  storeId: string;
  tenantId: string;
}) {
  return {
    action: "billing.plan_hire.activated" as const,
    audit: {
      actorId: input.actorId,
      actorKind: input.actorKind,
      requestId: input.requestId,
    },
    entityId: input.hireId,
    entityType: "billing_plan_hire" as const,
    idempotencyKey: `billing-audit:hire:${input.hireId}:activated`,
    metadata: {
      catalogVersion: input.catalogVersion,
      paymentId: input.paymentId,
      planId: input.planId,
      ...(input.providerCheckoutId
        ? { providerCheckoutId: input.providerCheckoutId }
        : {}),
      ...(input.providerEventId
        ? { providerEventId: input.providerEventId }
        : {}),
      ...(input.providerPaymentId
        ? { providerPaymentId: input.providerPaymentId }
        : {}),
      ...(input.providerSubscriptionId
        ? { providerSubscriptionId: input.providerSubscriptionId }
        : {}),
      quotedCents: input.quotedCents,
      status: "paid_active",
    },
    occurredAt: input.occurredAt,
    storeId: input.storeId,
    tenantId: input.tenantId,
  } as const;
}
