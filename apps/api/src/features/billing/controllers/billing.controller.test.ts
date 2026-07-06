import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createBillingFeature } from "./billing.controller.js";
import { createBillingServices } from "./billingServices.js";
import { createMemoryBillingProviderRepository } from "../adapters/memory/billingProviderRepository.js";
import { createMemoryBillingRepository } from "../adapters/memory/billingRepository.js";
import { createMemoryBillingWebhookRepository } from "../adapters/memory/billingWebhookRepository.js";
import { createMemoryPaymentProviderGateway } from "../adapters/memory/paymentProviderGateway.js";

describe("billing controller webhooks", () => {
  it("syncs the current subscription with the configured provider", async () => {
    const app = createTestApp("secret");
    const response = await app.request(
      "/api/v1/billing/provider/subscription/sync",
      {
        body: JSON.stringify({
          billingType: "PIX",
          nextDueDate: "2026-07-10",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      billingType: "PIX",
      chargeTotalCents: 29900,
      provider: "asaas",
      status: "active",
    });
  });

  it("accepts valid Asaas webhooks through an integration context", async () => {
    const app = createTestApp("secret");
    const response = await app.request("/api/v1/billing/webhooks/asaas", {
      body: JSON.stringify({
        event: "PAYMENT_RECEIVED",
        id: "evt_route_1",
        payment: {
          dueDate: "2026-07-31",
          id: "pay_route_1",
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
      providerEventId: "evt_route_1",
      status: "processed",
    });
  });

  it("rejects invalid Asaas webhook tokens", async () => {
    const app = createTestApp("secret");
    const response = await app.request("/api/v1/billing/webhooks/asaas", {
      body: JSON.stringify({ event: "PAYMENT_RECEIVED", id: "evt_route_2" }),
      headers: {
        "asaas-access-token": "wrong",
        "content-type": "application/json",
      },
      method: "POST",
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      code: "BILLING_WEBHOOK_AUTHENTICATION_FAILED",
    });
  });
});

function createTestApp(secret: string) {
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
          billingProviderRepository: createMemoryBillingProviderRepository(),
          billingRepository: createMemoryBillingRepository(),
          billingWebhookRepository: createMemoryBillingWebhookRepository(),
          environment: "test",
          paymentProviderGateway: createMemoryPaymentProviderGateway(
            [],
            secret,
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
  return app;
}
