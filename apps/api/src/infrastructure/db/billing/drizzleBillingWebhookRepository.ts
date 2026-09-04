import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import { providerEvents } from "@lojaveiculosv2/db";
import type {
  BillingProviderWebhookEvent,
  BillingWebhookRepository,
} from "../../../domains/billing/ports/billingWebhookRepository.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { syncProviderCheckout } from "./drizzleBillingCheckoutWebhook.js";
import { upsertProviderPayment } from "./drizzleBillingPaymentWebhook.js";
import { syncProviderSubscription } from "./drizzleBillingSubscriptionWebhook.js";

export function createDrizzleBillingWebhookRepository(
  db: DrizzleBillingClient,
): BillingWebhookRepository {
  return {
    async claimForProcessing(input) {
      const [row] = await db
        .update(providerEvents)
        .set({
          errorMessage: null,
          processedAt: null,
          processingAttempts: sql`${providerEvents.processingAttempts} + 1`,
          processingStartedAt: input.processingStartedAt,
          processingToken: input.processingToken,
          status: "processing",
          updatedAt: input.processingStartedAt,
        })
        .where(
          and(
            eq(providerEvents.id, input.eventId),
            or(
              eq(providerEvents.status, "failed"),
              eq(providerEvents.status, "pending_reconciliation"),
              eq(providerEvents.status, "received"),
              and(
                eq(providerEvents.status, "processing"),
                or(
                  isNull(providerEvents.processingStartedAt),
                  lte(providerEvents.processingStartedAt, input.staleBefore),
                ),
              ),
            ),
          ),
        )
        .returning();
      return row ? toWebhookEvent(row) : null;
    },
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
        .onConflictDoNothing()
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
      return db.transaction((tx) =>
        syncProviderSubscription(tx as DrizzleBillingClient, input),
      );
    },
    async updateStatus(input) {
      const filters = [eq(providerEvents.id, input.eventId)];
      if (input.processingToken) {
        filters.push(
          eq(providerEvents.status, "processing"),
          eq(providerEvents.processingToken, input.processingToken),
        );
      }
      const [row] = await db
        .update(providerEvents)
        .set({
          errorMessage: input.errorMessage ?? null,
          processedAt:
            input.status === "pending_reconciliation" ? null : new Date(),
          processingStartedAt: null,
          processingToken: null,
          status: input.status,
          storeId: input.storeId ?? null,
          tenantId: input.tenantId ?? null,
        })
        .where(and(...filters))
        .returning();
      return row ? toWebhookEvent(row) : null;
    },
    async upsertProviderPayment(input) {
      return db.transaction((tx) =>
        upsertProviderPayment(tx as DrizzleBillingClient, input),
      );
    },
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
    processingAttempts: row.processingAttempts,
    processingStartedAt: row.processingStartedAt,
    processingToken: row.processingToken,
    processedAt: row.processedAt,
    provider: row.provider as "asaas",
    providerEventId: row.providerEventId,
    status: row.status,
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
    updatedAt: row.updatedAt,
  } satisfies BillingProviderWebhookEvent;
}
