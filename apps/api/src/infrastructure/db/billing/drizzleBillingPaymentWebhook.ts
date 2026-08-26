import { and, eq } from "drizzle-orm";
import { payments } from "@lojaveiculosv2/db";
import type {
  BillingProviderSyncResult,
  UpsertBillingProviderPaymentInput,
} from "../../../domains/billing/ports/billingWebhookRepository.js";
import { activatePaidPlanHire } from "./drizzleBillingPaidPlanActivation.js";
import { enterPastDueGrace } from "./drizzleBillingPaymentGrace.js";
import {
  overduePaymentCanEnterGrace,
  restorePaidSubscriptionAccess,
} from "./drizzleBillingPaymentRecovery.js";
import { bindObservedPayment } from "./drizzleBillingPaymentHireState.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { resolvePaymentScope } from "./drizzleBillingWebhookScope.js";
import { recordBillingProductEvent } from "./drizzleBillingProductEvents.js";

export async function upsertProviderPayment(
  db: DrizzleBillingClient,
  input: UpsertBillingProviderPaymentInput,
): Promise<BillingProviderSyncResult> {
  const scope = await resolvePaymentScope(db, input);
  if (!scope) {
    return {
      reason: "unknown_billing_account",
      status: "pending_reconciliation",
      storeId: null,
      tenantId: null,
    };
  }
  const [existing] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.provider, input.provider),
        eq(payments.providerPaymentId, input.providerPaymentId),
      ),
    )
    .limit(1);
  const [payment] = await db
    .insert(payments)
    .values(paymentValues(input, scope, input.status))
    .onConflictDoUpdate({
      set: {
        ...paymentValues(
          input,
          scope,
          nextPaymentStatus(existing?.status ?? null, input.status),
        ),
        paidAt: input.paidAt ?? existing?.paidAt ?? null,
        updatedAt: new Date(),
      },
      target: [payments.provider, payments.providerPaymentId],
    })
    .returning();

  if (payment) {
    await recordBillingProductEvent(db, {
      eventName: "payment_observed",
      hireId: scope.hireId,
      idempotencyKey: `billing-payment:${input.providerPaymentId}:${input.status}`,
      properties: { status: input.status },
      providerCheckoutId: input.providerCheckoutId,
      providerEventId: input.providerEventId,
      providerPaymentId: input.providerPaymentId,
      providerSubscriptionId: input.providerSubscriptionId,
      requestId: input.requestId,
      storeId: scope.storeId,
      tenantId: scope.tenantId,
    });
  }

  if (
    payment &&
    isActionablePaidObservation(input.status, payment.status) &&
    scope.hireId
  ) {
    let activated: boolean;
    try {
      activated = await activatePaidPlanHire(db, {
        input,
        paymentId: payment.id,
        scope: { ...scope, hireId: scope.hireId },
      });
    } catch (cause) {
      throw new BillingContractActivationOrProjectionError(cause);
    }
    if (!activated) {
      return {
        reason: "ambiguous_or_invalid_hire_payment",
        status: "pending_reconciliation",
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      };
    }
  } else if (
    payment &&
    input.status !== "paid" &&
    payment.status !== "paid" &&
    scope.hireId
  ) {
    await bindObservedPayment(db, scope.hireId, input);
  }
  if (
    payment &&
    isActionablePaidObservation(input.status, payment.status) &&
    scope.subscriptionId
  ) {
    await restorePaidSubscriptionAccess(db, {
      dueAt: input.dueAt,
      paymentId: payment.id,
      providerEventId: input.providerEventId,
      storeId: scope.storeId,
      subscriptionId: scope.subscriptionId,
      tenantId: scope.tenantId,
    });
  }
  if (
    payment &&
    input.status === "overdue" &&
    payment.status === "overdue" &&
    scope.subscriptionId &&
    (await overduePaymentCanEnterGrace(db, {
      dueAt: input.dueAt,
      subscriptionId: scope.subscriptionId,
      tenantId: scope.tenantId,
    }))
  ) {
    await enterPastDueGrace(db, {
      storeId: scope.storeId,
      subscriptionId: scope.subscriptionId,
      tenantId: scope.tenantId,
    });
  }
  return {
    status: "synced",
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  };
}

export class BillingContractActivationOrProjectionError extends Error {
  constructor(cause: unknown) {
    super(
      "Paid billing contract activation or entitlement projection failed.",
      {
        cause,
      },
    );
    this.name = "BillingContractActivationOrProjectionError";
  }
}

function paymentValues(
  input: UpsertBillingProviderPaymentInput,
  scope: Awaited<ReturnType<typeof resolvePaymentScope>> & {},
  status: (typeof payments.$inferInsert)["status"],
) {
  return {
    amountCents: input.amountCents,
    dueAt: input.dueAt,
    externalReference: input.externalReference,
    invoiceUrl: input.invoiceUrl,
    paidAt: input.paidAt,
    provider: input.provider,
    providerPaymentId: input.providerPaymentId,
    raw: input.raw,
    status,
    storeId: scope.storeId,
    subscriptionId: scope.subscriptionId,
    tenantId: scope.tenantId,
  };
}

export function nextPaymentStatus(
  current: (typeof payments.$inferSelect)["status"] | null,
  incoming: UpsertBillingProviderPaymentInput["status"],
) {
  if (current === "refunded") return current;
  if (current === "paid" && incoming !== "refunded") return current;
  return incoming;
}

export function isActionablePaidObservation(
  incoming: UpsertBillingProviderPaymentInput["status"],
  persisted: (typeof payments.$inferSelect)["status"],
) {
  return incoming === "paid" && persisted === "paid";
}
