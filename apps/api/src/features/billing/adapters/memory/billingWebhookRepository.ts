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
          status: "ignored",
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
          status: "ignored",
          storeId: null,
          tenantId: null,
        };
      }
      return existing;
    },
    async updateStatus(input) {
      const event = events.find((item) => item.id === input.eventId);
      if (!event) return null;
      event.errorMessage = input.errorMessage ?? null;
      event.processedAt = new Date();
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
          status: "ignored",
          storeId: null,
          tenantId: null,
        };
      }
      payments.set(input.providerPaymentId, scope);
      return scope;
    },
  };
}
