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

describe("billing controller webhooks", () => {
  it("denies store-scoped billing for owners blocked by agency billing", async () => {
    const app = createTestApp("secret", []);
    const response = await app.request("/api/v1/billing/overview");

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      code: "AUTHORIZATION_DENIED",
    });
  });

  it("creates a durable plan hire and exposes it for polling", async () => {
    const app = createTestApp("secret");
    const response = await app.request("/api/v1/billing/plan-hires", {
      body: JSON.stringify({
        billingTypes: ["CREDIT_CARD", "PIX"],
        idempotencyKey: "hire-route-test-1",
        planId: "83262608-0000-4000-8000-000000000002",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(201);
    const hire = (await response.json()) as { id: string };
    expect(hire).toMatchObject({
      checkoutUrl:
        "https://sandbox.asaas.com/checkoutSession/show?id=chk_memory_asaas",
      phase: "checkout_created",
      planSnapshot: { code: "essencial" },
      providerCheckoutId: "chk_memory_asaas",
      quotedCents: 19700,
      status: "checkout_created",
    });

    const poll = await app.request(`/api/v1/billing/plan-hires/${hire.id}`);
    expect(poll.status).toBe(200);
    await expect(poll.json()).resolves.toMatchObject({ id: hire.id });
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

function createTestApp(secret: string, permissions = ["billing.manage"]) {
  const app = new Hono();
  app.route(
    "/api/v1/billing",
    createBillingFeature({
      contextFactory: async () =>
        createServiceContext({
          actor: { id: "user_1", kind: "user" },
          billingManagedBy: permissions.includes("billing.manage")
            ? "store_owner"
            : "agency",
          permissions,
          request: { requestId: "request_1" },
          storeId: "store_1",
          tenantId: "tenant_1",
        }),
      services: createBillingServices({
        ports: {
          billingPlanHireRepository: createMemoryBillingPlanHireRepository(),
          billingProviderRepository: createMemoryBillingProviderRepository(),
          billingRepository: createMemoryBillingRepository(),
          billingWebhookRepository: createMemoryBillingWebhookRepository(),
          environment: "test",
          paymentProviderGateway: createMemoryPaymentProviderGateway(
            [],
            secret,
          ),
          publicAppUrl: "http://localhost:5173",
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
