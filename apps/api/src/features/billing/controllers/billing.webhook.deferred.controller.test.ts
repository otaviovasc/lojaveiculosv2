import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createBillingFeature } from "./billing.controller.js";
import { createBillingServices } from "./billingServices.js";
import { createMemoryBillingProviderRepository } from "../adapters/memory/billingProviderRepository.js";
import { createMemoryBillingPlanHireRepository } from "../adapters/memory/billingPlanHireRepository.js";
import { createMemoryBillingRepository } from "../adapters/memory/billingRepository.js";
import { createMemoryBillingWebhookRepository } from "../adapters/memory/billingWebhookRepository.js";
import { createMemoryPaymentProviderGateway } from "../adapters/memory/paymentProviderGateway.js";

describe("deferred Asaas billing webhook", () => {
  it("acknowledges a recorded event without running provider processing", async () => {
    const webhookRepository = createMemoryBillingWebhookRepository();
    const updateStatus = vi.fn(webhookRepository.updateStatus);
    const app = new Hono();
    app.route(
      "/api/v1/billing",
      createBillingFeature({
        contextFactory: async () =>
          createServiceContext({
            actor: { id: "user_1", kind: "user" },
            permissions: ["billing.manage"],
            request: { requestId: "request_1" },
            storeId: "store_1",
            tenantId: "tenant_1",
          }),
        services: createBillingServices({
          ports: {
            billingPlanHireRepository: createMemoryBillingPlanHireRepository(),
            billingProviderRepository: createMemoryBillingProviderRepository(),
            billingRepository: createMemoryBillingRepository(),
            billingWebhookRepository: {
              ...webhookRepository,
              updateStatus,
              syncProviderCheckout: async () => {
                throw new Error(
                  "Provider processing must not run in the request.",
                );
              },
            },
            environment: "test",
            paymentProviderGateway: createMemoryPaymentProviderGateway(
              [],
              "secret",
            ),
          },
        }),
        webhookContextFactory: async () =>
          createServiceContext({
            actor: { id: "asaas", kind: "integration" },
            audit: { record: vi.fn(async () => undefined) },
            permissions: ["billing.webhook.ingest"],
            request: { requestId: "request_1" },
          }),
      }),
    );

    const response = await app.request("/api/v1/billing/webhooks/asaas", {
      body: JSON.stringify({
        event: "PAYMENT_RECEIVED",
        id: "evt_route_deferred_failure",
        payment: {
          dueDate: "2026-07-31",
          id: "pay_route_deferred_failure",
          subscription: "sub_memory",
          value: 548.99,
        },
      }),
      headers: {
        "asaas-access-token": "secret",
        "content-type": "application/json",
      },
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      providerEventId: "evt_route_deferred_failure",
      status: "pending_reconciliation",
    });
    expect(updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedStatus: "received",
        status: "pending_reconciliation",
      }),
    );
  });

  it("does not clobber a worker claim when the event is already processing", async () => {
    const webhookRepository = createMemoryBillingWebhookRepository();
    const recorded = await webhookRepository.recordReceived({
      environment: "test",
      eventType: "PAYMENT_RECEIVED",
      payload: { id: "pay_race" },
      provider: "asaas",
      providerEventId: "evt_race",
    });
    await webhookRepository.claimForProcessing({
      eventId: recorded.event.id,
      processingStartedAt: new Date(),
      processingToken: "worker-token",
      staleBefore: new Date(Date.now() - 300_000),
    });

    const clobbered = await webhookRepository.updateStatus({
      eventId: recorded.event.id,
      expectedStatus: "received",
      status: "pending_reconciliation",
    });

    expect(clobbered).toBeNull();
    const event = (
      await webhookRepository.recordReceived({
        environment: "test",
        eventType: "PAYMENT_RECEIVED",
        payload: { id: "pay_race" },
        provider: "asaas",
        providerEventId: "evt_race",
      })
    ).event;
    expect(event.status).toBe("processing");
    expect(event.processingToken).toBe("worker-token");
  });
});
