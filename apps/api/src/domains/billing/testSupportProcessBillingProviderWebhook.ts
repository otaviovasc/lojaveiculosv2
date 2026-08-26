import type { AuditEvent, AuditSink } from "@lojaveiculosv2/audit";
import { vi } from "vitest";
import { createServiceContext } from "../../shared/serviceContext.js";
import type { BillingRepository } from "./ports/billingRepository.js";
import type {
  BillingProviderSyncResult,
  BillingProviderWebhookEvent,
  BillingWebhookRepository,
} from "./ports/billingWebhookRepository.js";
import type { PaymentProviderGateway } from "./ports/paymentProviderGateway.js";

export function createWebhookContext(audit: AuditSink) {
  return createServiceContext({
    actor: { id: "asaas", kind: "integration" },
    audit,
    permissions: ["billing.webhook.ingest"],
    request: { requestId: "request_1" },
    source: { component: "test", service: "api" },
  });
}

export function createAuditSink(): AuditSink {
  const record = vi.fn(async (_event: AuditEvent) => undefined);
  return { record };
}

export function createBillingRepository(): BillingRepository {
  return {
    activateSubscriptionSelection: async () => undefined,
    getOverview: async () => {
      throw new Error("Unused billing repository.");
    },
    getTenantOverview: async () => {
      throw new Error("Unused billing repository.");
    },
    storeExistsInTenant: async () => {
      throw new Error("Unused billing repository.");
    },
    updateStoreEntitlement: async () => {
      throw new Error("Unused billing repository.");
    },
  };
}

export function createProviderGateway(secret: string): PaymentProviderGateway {
  return {
    async getProviderStatus() {
      return {
        configured: true,
        missingConfiguration: [],
        provider: "asaas",
        webhookConfigured: true,
      };
    },
    verifyWebhookToken: (token) => token === secret,
  };
}

export function createWebhookRepository(): BillingWebhookRepository {
  const events: BillingProviderWebhookEvent[] = [];
  const checkoutScope: BillingProviderSyncResult = {
    status: "synced",
    storeId: "store_1" as never,
    tenantId: "tenant_1" as never,
  };
  const scope: BillingProviderSyncResult = {
    status: "synced",
    storeId: "store_1" as never,
    tenantId: "tenant_1" as never,
  };

  return {
    async claimForProcessing(input) {
      const event = events.find((item) => item.id === input.eventId);
      if (!event) return null;
      const claimable =
        event.status === "failed" ||
        event.status === "received" ||
        (event.status === "processing" &&
          (!event.processingStartedAt ||
            event.processingStartedAt <= input.staleBefore));
      if (!claimable) return null;
      event.processingAttempts += 1;
      event.processingStartedAt = input.processingStartedAt;
      event.processingToken = input.processingToken;
      event.status = "processing";
      return event;
    },
    async recordReceived(input) {
      const existing = events.find(
        (event) => event.providerEventId === input.providerEventId,
      );
      if (existing) return { created: false, event: existing };
      const now = new Date();
      const event: BillingProviderWebhookEvent = {
        createdAt: now,
        environment: input.environment,
        errorMessage: null,
        eventType: input.eventType,
        id: `event_${events.length + 1}`,
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
      return input.providerCheckoutId === "chk_memory"
        ? checkoutScope
        : {
            reason: "unknown_checkout",
            status: "ignored",
            storeId: null,
            tenantId: null,
          };
    },
    async syncProviderSubscription() {
      return scope;
    },
    async updateStatus(input) {
      const event = events.find((item) => item.id === input.eventId);
      if (!event) return null;
      if (
        input.processingToken &&
        event.processingToken !== input.processingToken
      ) {
        return null;
      }
      event.status = input.status;
      event.processingStartedAt = null;
      event.processingToken = null;
      event.storeId = input.storeId ?? null;
      event.tenantId = input.tenantId ?? null;
      return event;
    },
    async upsertProviderPayment() {
      return scope;
    },
  };
}
