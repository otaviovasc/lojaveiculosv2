import { and, eq } from "drizzle-orm";
import { payments, providerEvents, subscriptions } from "@lojaveiculosv2/db";
import type {
  BillingProviderSyncResult,
  BillingProviderWebhookEvent,
  BillingWebhookRepository,
  SyncBillingProviderSubscriptionInput,
  UpsertBillingProviderPaymentInput,
} from "../../../domains/billing/ports/billingWebhookRepository.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { syncProviderCheckout } from "./drizzleBillingCheckoutWebhook.js";
import {
  resolvePaymentScope,
  resolveStoreId,
} from "./drizzleBillingWebhookScope.js";

export function createDrizzleBillingWebhookRepository(
  db: DrizzleBillingClient,
): BillingWebhookRepository {
  return {
    async recordReceived(input) {
      const [inserted] = await db
        .insert(providerEvents)
        .values({
          environment: input.environment,
          eventType: input.eventType,
          payload: input.payload,
          provider: input.provider,
          providerEventId: input.providerEventId,
        })
        .onConflictDoNothing({
          target: [
            providerEvents.provider,
            providerEvents.environment,
            providerEvents.providerEventId,
          ],
        })
        .returning();
      if (inserted) return { created: true, event: toWebhookEvent(inserted) };

      const [existing] = await db
        .select()
        .from(providerEvents)
        .where(
          and(
            eq(providerEvents.provider, input.provider),
            eq(providerEvents.environment, input.environment),
            eq(providerEvents.providerEventId, input.providerEventId),
          ),
        )
        .limit(1);
      if (!existing) {
        throw new Error("Billing provider webhook event was not persisted.");
      }
      return { created: false, event: toWebhookEvent(existing) };
    },
    async syncProviderCheckout(input) {
      return syncProviderCheckout(db, input);
    },
    async syncProviderSubscription(input) {
      return syncProviderSubscription(db, input);
    },
    async updateStatus(input) {
      const [row] = await db
        .update(providerEvents)
        .set({
          errorMessage: input.errorMessage ?? null,
          processedAt: new Date(),
          status: input.status,
          storeId: input.storeId ?? null,
          tenantId: input.tenantId ?? null,
        })
        .where(eq(providerEvents.id, input.eventId))
        .returning();
      return row ? toWebhookEvent(row) : null;
    },
    async upsertProviderPayment(input) {
      return upsertProviderPayment(db, input);
    },
  };
}

async function upsertProviderPayment(
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

  await db
    .insert(payments)
    .values({
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
    })
    .onConflictDoUpdate({
      set: {
        amountCents: input.amountCents,
        dueAt: input.dueAt,
        externalReference: input.externalReference,
        invoiceUrl: input.invoiceUrl,
        paidAt: input.paidAt,
        raw: input.raw,
        status: input.status,
        storeId: scope.storeId,
        subscriptionId: scope.subscriptionId,
        tenantId: scope.tenantId,
        updatedAt: new Date(),
      },
      target: [payments.provider, payments.providerPaymentId],
    });

  return {
    status: "synced",
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  };
}

async function syncProviderSubscription(
  db: DrizzleBillingClient,
  input: SyncBillingProviderSubscriptionInput,
): Promise<BillingProviderSyncResult> {
  const [subscription] = await db
    .update(subscriptions)
    .set({
      currentPeriodEnd: input.currentPeriodEnd,
      status: input.status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(subscriptions.provider, input.provider),
        eq(subscriptions.providerSubscriptionId, input.providerSubscriptionId),
      ),
    )
    .returning();
  if (!subscription) {
    return {
      reason: "unknown_subscription",
      status: "ignored",
      storeId: null,
      tenantId: null,
    };
  }

  const storeId = await resolveStoreId(db, subscription.id);
  return {
    status: "synced",
    storeId: storeId as never,
    tenantId: subscription.tenantId as never,
  };
}

function toWebhookEvent(row: typeof providerEvents.$inferSelect) {
  return {
    createdAt: row.createdAt,
    environment: row.environment,
    errorMessage: row.errorMessage,
    eventType: row.eventType,
    id: row.id,
    payload: row.payload as Record<string, unknown>,
    processedAt: row.processedAt,
    provider: row.provider as "asaas",
    providerEventId: row.providerEventId,
    status: row.status,
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
    updatedAt: row.updatedAt,
  } satisfies BillingProviderWebhookEvent;
}
