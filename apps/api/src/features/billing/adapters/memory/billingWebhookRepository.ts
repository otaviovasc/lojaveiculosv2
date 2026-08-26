import { randomUUID } from "node:crypto";
import type {
  BillingProviderSyncResult,
  BillingProviderWebhookEvent,
  BillingWebhookRepository,
} from "../../../../domains/billing/ports/billingWebhookRepository.js";

export function createMemoryBillingWebhookRepository(): BillingWebhookRepository {
  const events: BillingProviderWebhookEvent[] = [];
  const checkouts = new Map<string, BillingProviderSyncResult>();
  const payments = new Map<string, BillingProviderSyncResult>();
  const subscriptions = new Map<string, BillingProviderSyncResult>();

  checkouts.set("chk_memory_asaas", {
    status: "synced",
    storeId: "store_1" as never,
    tenantId: "tenant_1" as never,
  });
  subscriptions.set("sub_memory", {
    status: "synced",
    storeId: "store_1" as never,
    tenantId: "tenant_1" as never,
  });

  return {
    async claimForProcessing(input) {
      const event = events.find((item) => item.id === input.eventId);
      if (!event) return null;
      const claimable =
        event.status === "failed" ||
        event.status === "pending_reconciliation" ||
        event.status === "received" ||
        (event.status === "processing" &&
          (!event.processingStartedAt ||
            event.processingStartedAt <= input.staleBefore));
      if (!claimable) return null;
      event.errorMessage = null;
      event.processedAt = null;
      event.processingAttempts += 1;
      event.processingStartedAt = input.processingStartedAt;
      event.processingToken = input.processingToken;
      event.status = "processing";
      event.updatedAt = input.processingStartedAt;
      return event;
    },
    async recordReceived(input) {
      const existing = events.find(
        (event) =>
          event.provider === input.provider &&
          event.environment === input.environment &&
          event.providerEventId === input.providerEventId,
      );
      if (existing) return { created: false, event: existing };

      const now = new Date();
      const event: BillingProviderWebhookEvent = {
        createdAt: now,
        environment: input.environment,
        errorMessage: null,
        eventType: input.eventType,
        id: randomUUID(),
        payload: input.payload,
        processingAttempts: 0,
        processingStartedAt: null,
        processingToken: null,
        processedAt: null,
        provider: input.provider,
        providerEventId: input.providerEventId,
        status: "received",
        storeId: null,
        tenantId: null,
        updatedAt: now,
      };
      events.push(event);
      return { created: true, event };
    },
    async syncProviderCheckout(input) {
      const existing = checkouts.get(input.providerCheckoutId);
      if (!existing) {
        return {
          reason: "unknown_checkout",
          status: "pending_reconciliation",
          storeId: null,
          tenantId: null,
        };
      }
      return existing;
    },
    async syncProviderSubscription(input) {
      const existing = subscriptions.get(input.providerSubscriptionId);
      if (!existing) {
        return {
          reason: "unknown_subscription",
          status: "pending_reconciliation",
          storeId: null,
          tenantId: null,
        };
      }
      return existing;
    },
    async updateStatus(input) {
      const event = events.find((item) => item.id === input.eventId);
      if (!event) return null;
      if (
        input.processingToken &&
        (event.status !== "processing" ||
          event.processingToken !== input.processingToken)
      ) {
        return null;
      }
      event.errorMessage = input.errorMessage ?? null;
      event.processedAt = new Date();
      event.processingStartedAt = null;
      event.processingToken = null;
      event.status = input.status;
      event.storeId = input.storeId ?? event.storeId;
      event.tenantId = input.tenantId ?? event.tenantId;
      event.updatedAt = new Date();
      return event;
    },
    async upsertProviderPayment(input) {
      const scope = input.providerSubscriptionId
        ? subscriptions.get(input.providerSubscriptionId)
        : null;
      if (!scope) {
        return {
          reason: "unknown_subscription",
          status: "pending_reconciliation",
          storeId: null,
          tenantId: null,
        };
      }
      payments.set(input.providerPaymentId, scope);
      return scope;
    },
  };
}
