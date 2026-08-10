import { and, eq, inArray } from "drizzle-orm";
import {
  billingAddonContracts,
  payments,
  storeEntitlements,
  subscriptionItems,
  subscriptions,
} from "@lojaveiculosv2/db";
import type {
  BillingProviderSyncResult,
  UpsertBillingProviderPaymentInput,
} from "../../../domains/billing/ports/billingWebhookRepository.js";
import { activateZapiContractsForPaidRenewal } from "./drizzleBillingAddonContracts.js";
import { projectSelectedEntitlements } from "./drizzleBillingEntitlementProjection.js";
import { enqueueZapiCancellationReconciliation } from "./drizzleBillingProviderReconciliation.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { resolvePaymentScope } from "./drizzleBillingWebhookScope.js";

export async function upsertProviderPayment(
  db: DrizzleBillingClient,
  input: UpsertBillingProviderPaymentInput,
): Promise<BillingProviderSyncResult> {
  const scope = await resolvePaymentScope(db, input);
  if (!scope) {
    return {
      reason: "unknown_billing_account",
      status: "ignored",
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
  const reversesPaid =
    existing?.status === "paid" &&
    (input.status === "refunded" || input.status === "cancelled");
  const [payment] = await db
    .insert(payments)
    .values(paymentValues(input, scope))
    .onConflictDoUpdate({
      set: {
        ...paymentValues(input, scope),
        paidAt: reversesPaid ? existing.paidAt : input.paidAt,
        status: reversesPaid ? "paid" : input.status,
        updatedAt: new Date(),
      },
      target: [payments.provider, payments.providerPaymentId],
    })
    .returning();

  if (
    payment &&
    input.status === "paid" &&
    input.dueAt &&
    scope.subscriptionId
  ) {
    await activatePaidRenewal(
      db,
      { ...input, dueAt: input.dueAt },
      payment.id,
      scope.subscriptionId,
    );
  }
  if (payment && reversesPaid && scope.subscriptionId) {
    await schedulePaidPeriodCancellation(db, {
      paymentId: payment.id,
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

async function activatePaidRenewal(
  db: DrizzleBillingClient,
  input: UpsertBillingProviderPaymentInput & { dueAt: Date },
  paymentId: string,
  subscriptionId: string,
) {
  const activated = await activateZapiContractsForPaidRenewal(db, {
    amountCents: input.amountCents,
    dueAt: input.dueAt,
    paidAt: input.paidAt ?? new Date(),
    paymentId,
    providerEventId: input.providerEventId,
    subscriptionId,
  });
  for (const contract of activated) {
    await projectSelectedEntitlements(db, {
      source: "billing_selection",
      storeId: contract.storeId,
      subscriptionId: contract.subscriptionId,
      tenantId: contract.tenantId,
    });
  }
}

async function schedulePaidPeriodCancellation(
  db: DrizzleBillingClient,
  input: { paymentId: string; subscriptionId: string; tenantId: string },
) {
  const [subscription] = await db
    .select({ currentPeriodEnd: subscriptions.currentPeriodEnd })
    .from(subscriptions)
    .where(eq(subscriptions.id, input.subscriptionId))
    .limit(1);
  const effectiveAt = subscription?.currentPeriodEnd ?? new Date();
  const contracts = await db
    .update(billingAddonContracts)
    .set({
      cancellationScheduledFor: effectiveAt,
      cancellationSyncPending: true,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(billingAddonContracts.activatedByPaymentId, input.paymentId),
        inArray(billingAddonContracts.status, [
          "paid_awaiting_setup",
          "active",
        ]),
      ),
    )
    .returning({
      storeId: billingAddonContracts.storeId,
      subscriptionItemId: billingAddonContracts.subscriptionItemId,
    });
  for (const contract of contracts) {
    await db
      .update(subscriptionItems)
      .set({ endsAt: effectiveAt, updatedAt: new Date() })
      .where(eq(subscriptionItems.id, contract.subscriptionItemId));
    await db
      .update(storeEntitlements)
      .set({ endsAt: effectiveAt, updatedAt: new Date() })
      .where(
        and(
          eq(storeEntitlements.tenantId, input.tenantId),
          eq(storeEntitlements.storeId, contract.storeId),
          eq(storeEntitlements.featureKey, "crm_zapi"),
          inArray(storeEntitlements.status, ["active", "trialing"]),
        ),
      );
  }
  if (contracts.length) await enqueueZapiCancellationReconciliation(db, input);
}

function paymentValues(
  input: UpsertBillingProviderPaymentInput,
  scope: Awaited<ReturnType<typeof resolvePaymentScope>> & {},
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
    status: input.status,
    storeId: scope.storeId,
    subscriptionId: scope.subscriptionId,
    tenantId: scope.tenantId,
  };
}
