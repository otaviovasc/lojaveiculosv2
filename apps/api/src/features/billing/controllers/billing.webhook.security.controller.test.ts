import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { BillingWebhookRateLimiterUnavailableError } from "../../../domains/billing/ports/billingWebhookRateLimiter.js";
import type { BillingWebhookRateLimiter } from "../../../domains/billing/ports/billingWebhookRateLimiter.js";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createBillingFeature } from "./billing.controller.js";
import {
  unavailableBillingServices,
  type BillingServices,
} from "./billingServices.js";

const endpoint = "/api/v1/billing/webhooks/asaas";
const validPayload = {
  event: "PAYMENT_CONFIRMED",
  id: "evt_security_1",
  payment: { id: "pay_security_1", subscription: "sub_1", value: 197 },
};

describe("Asaas webhook HTTP security", () => {
  it("authenticates before reading an oversized or malformed body", async () => {
    const process = vi.fn<BillingServices["processAsaasWebhook"]>();
    const app = createWebhookApp({ process });
    const response = await send(app, "not-json".repeat(30_000), "wrong");

    expect(response.status).toBe(401);
    expect(process).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain("wrong");
  });

  it("rejects payload bytes above the webhook-specific limit", async () => {
    const app = createWebhookApp();
    const response = await send(
      app,
      JSON.stringify({ ...validPayload, padding: "x".repeat(140_000) }),
    );

    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({
      code: "BILLING_WEBHOOK_PAYLOAD_TOO_LARGE",
    });
  });

  it.each([
    ["malformed", "{"],
    [
      "deep",
      JSON.stringify({
        ...validPayload,
        payment: { ...validPayload.payment, raw: deeplyNested(10) },
      }),
    ],
    [
      "wide",
      JSON.stringify({
        ...validPayload,
        ...Object.fromEntries(
          Array.from({ length: 101 }, (_, index) => [`field_${index}`, index]),
        ),
      }),
    ],
    ["schema", JSON.stringify({ ...validPayload, payment: [] })],
    [
      "entity schema",
      JSON.stringify({ ...validPayload, payment: { id: "pay_without_value" } }),
    ],
  ])("rejects %s webhook structures with 422", async (_name, body) => {
    const response = await send(createWebhookApp(), body);

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      code: "BILLING_WEBHOOK_INVALID",
    });
  });

  it("returns 429 with retry guidance without processing the event", async () => {
    const process = vi.fn<BillingServices["processAsaasWebhook"]>();
    const app = createWebhookApp({
      process,
      rateLimiter: {
        consume: vi.fn(async () => ({
          allowed: false as const,
          retryAfterSeconds: 23,
        })),
      },
    });
    const response = await send(app, JSON.stringify(validPayload));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("23");
    expect(process).not.toHaveBeenCalled();
  });

  it("fails closed when the shared limiter is unavailable", async () => {
    const response = await send(
      createWebhookApp({
        rateLimiter: {
          consume: vi.fn(async () => {
            throw new BillingWebhookRateLimiterUnavailableError();
          }),
        },
      }),
      JSON.stringify(validPayload),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      code: "BILLING_WEBHOOK_SECURITY_UNAVAILABLE",
    });
  });

  it("accepts a bounded official payment envelope", async () => {
    const process = vi.fn(async () => ({
      eventId: "local_event_1",
      providerEventId: validPayload.id,
      status: "processed" as const,
    }));
    const response = await send(
      createWebhookApp({ process }),
      JSON.stringify(validPayload),
    );

    expect(response.status).toBe(200);
    expect(process).toHaveBeenCalledOnce();
  });

  it.each([
    {
      checkout: { id: "chk_1", status: "PAID", subscription: null },
      event: "CHECKOUT_PAID",
      id: "evt_checkout_1",
    },
    {
      event: "SUBSCRIPTION_UPDATED",
      id: "evt_subscription_1",
      subscription: {
        externalReference: "hire_1",
        id: "sub_1",
        nextDueDate: "2026-09-26",
        status: "ACTIVE",
      },
    },
  ])("accepts bounded official $event envelopes", async (payload) => {
    const response = await send(createWebhookApp(), JSON.stringify(payload));

    expect(response.status).toBe(200);
  });
});

function createWebhookApp(
  options: {
    process?: BillingServices["processAsaasWebhook"];
    rateLimiter?: BillingWebhookRateLimiter;
  } = {},
) {
  const app = new Hono();
  app.route(
    "/api/v1/billing",
    createBillingFeature({
      services: {
        ...unavailableBillingServices,
        processAsaasWebhook:
          options.process ??
          vi.fn(async () => ({
            eventId: "local_event_1",
            providerEventId: validPayload.id,
            status: "processed" as const,
          })),
        verifyAsaasWebhookToken: (token) => token === "secret",
      },
      webhookContextFactory: async () =>
        createServiceContext({
          actor: { id: "asaas", kind: "integration" },
          permissions: ["billing.webhook.ingest"],
          request: { requestId: "request_security_1" },
        }),
      ...(options.rateLimiter
        ? { webhookRateLimiter: options.rateLimiter }
        : {}),
    }),
  );
  return app;
}

function send(app: Hono, body: string, token = "secret") {
  return app.request(endpoint, {
    body,
    headers: {
      "asaas-access-token": token,
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.10",
    },
    method: "POST",
  });
}

function deeplyNested(depth: number): unknown {
  return depth === 0 ? "leaf" : { child: deeplyNested(depth - 1) };
}
