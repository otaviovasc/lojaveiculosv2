import type { AuditEvent, AuditSink } from "@lojaveiculosv2/audit";
import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { BillingRepository } from "../../ports/billingRepository.js";
import type {
  BillingProviderSyncResult,
  BillingProviderWebhookEvent,
  BillingWebhookRepository,
} from "../../ports/billingWebhookRepository.js";
import type { PaymentProviderGateway } from "../../ports/paymentProviderGateway.js";
import { processBillingProviderWebhook } from "./processBillingProviderWebhook.js";
import { BillingWebhookAuthenticationError } from "../../readModels/billingWebhookErrors.js";

describe("processBillingProviderWebhook", () => {
  it("syncs a received Asaas payment and records duplicate events once", async () => {
    const audit = createAuditSink();
    const context = createWebhookContext(audit);
    const ports = {
      billingRepository: createBillingRepository(),
      billingWebhookRepository: createWebhookRepository(),
      environment: "test",
      paymentProviderGateway: createProviderGateway("secret"),
    };
    const payload = {
      event: "PAYMENT_RECEIVED",
      id: "evt_payment_received_1",
      payment: {
        customer: "cus_1",
        dueDate: "2026-07-31",
        externalReference: "lojaveiculos:tenant_1:2026-07",
        id: "pay_1",
        invoiceUrl: "https://sandbox.asaas.com/i/pay_1",
        paymentDate: "2026-07-06",
        subscription: "sub_memory",
        value: 548.99,
      },
    };

    await expect(
      processBillingProviderWebhook(
        context,
        { payload, provider: "asaas", webhookToken: "secret" },
        ports,
      ),
    ).resolves.toMatchObject({
      providerEventId: "evt_payment_received_1",
      status: "processed",
    });
    await expect(
      processBillingProviderWebhook(
        context,
        { payload, provider: "asaas", webhookToken: "secret" },
        ports,
      ),
    ).resolves.toMatchObject({ status: "duplicate" });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "billing.webhook.asaas.processed",
        outcome: "succeeded",
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    );
  });

  it("rejects invalid webhook tokens before recording events", async () => {
    const ports = {
      billingRepository: createBillingRepository(),
      billingWebhookRepository: createWebhookRepository(),
      environment: "test",
      paymentProviderGateway: createProviderGateway("secret"),
    };

    await expect(
      processBillingProviderWebhook(
        createWebhookContext(createAuditSink()),
        {
          payload: { event: "PAYMENT_RECEIVED", id: "evt_invalid" },
          provider: "asaas",
          webhookToken: "wrong",
        },
        ports,
      ),
    ).rejects.toBeInstanceOf(BillingWebhookAuthenticationError);
  });
});

function createWebhookContext(audit: AuditSink) {
  return createServiceContext({
    actor: { id: "asaas", kind: "integration" },
    audit,
    permissions: ["billing.webhook.ingest"],
    request: { requestId: "request_1" },
    source: { component: "test", service: "api" },
  });
}

function createAuditSink(): AuditSink {
  const record = vi.fn(async (_event: AuditEvent) => undefined);
  return { record };
}

function createBillingRepository(): BillingRepository {
  return {
    getOverview: async () => {
      throw new Error("Unused billing repository.");
    },
    updateStoreEntitlement: async () => {
      throw new Error("Unused billing repository.");
    },
  };
}

function createProviderGateway(secret: string): PaymentProviderGateway {
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

function createWebhookRepository(): BillingWebhookRepository {
  const events: BillingProviderWebhookEvent[] = [];
  const scope: BillingProviderSyncResult = {
    status: "synced",
    storeId: "store_1" as never,
    tenantId: "tenant_1" as never,
  };

  return {
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
    async syncProviderSubscription() {
      return scope;
    },
    async updateStatus(input) {
      const event = events.find((item) => item.id === input.eventId);
      if (!event) return null;
      event.status = input.status;
      event.storeId = input.storeId ?? null;
      event.tenantId = input.tenantId ?? null;
      return event;
    },
    async upsertProviderPayment() {
      return scope;
    },
  };
}
