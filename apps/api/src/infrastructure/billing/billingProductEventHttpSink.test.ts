import { describe, expect, it, vi } from "vitest";
import type { BillingProductEventLease } from "../../domains/billing/ports/billingProductEventDelivery.js";
import { createBillingProductEventHttpSink } from "./billingProductEventHttpSink.js";

describe("billing product-event HTTP sink", () => {
  it("requires a token and HTTPS outside local development", () => {
    expect(() =>
      createBillingProductEventHttpSink({
        APP_ENV: "staging",
        BILLING_PRODUCT_EVENT_SINK_URL: "https://events.example.test/ingest",
      }),
    ).toThrow(/TOKEN/);
    expect(() =>
      createBillingProductEventHttpSink({
        APP_ENV: "staging",
        BILLING_PRODUCT_EVENT_SINK_TOKEN: "token",
        BILLING_PRODUCT_EVENT_SINK_URL: "http://events.example.test/ingest",
      }),
    ).toThrow(/HTTPS/);
  });

  it("sends a versioned payload and idempotency key", async () => {
    const fetchImpl = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(null, { status: 202 }),
    );
    const sink = createBillingProductEventHttpSink(
      {
        APP_ENV: "staging",
        BILLING_PRODUCT_EVENT_SINK_TOKEN: "secret-token",
        BILLING_PRODUCT_EVENT_SINK_URL: "https://events.example.test/ingest",
      },
      fetchImpl,
    );
    await expect(sink?.deliver(event())).resolves.toEqual({
      kind: "delivered",
    });
    expect(fetchImpl.mock.calls[0]?.[0]).toEqual(
      new URL("https://events.example.test/ingest"),
    );
    const request = fetchImpl.mock.calls[0]?.[1];
    expect(request?.method).toBe("POST");
    expect(request?.headers).toMatchObject({
      "idempotency-key": "event-key-1",
    });
    const body = JSON.parse(String(request?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({ schemaVersion: "billing-product-event.v1" });
  });

  it("classifies rate limits and provider outages as retryable", async () => {
    const sink = createBillingProductEventHttpSink(
      {
        APP_ENV: "staging",
        BILLING_PRODUCT_EVENT_SINK_TOKEN: "secret-token",
        BILLING_PRODUCT_EVENT_SINK_URL: "https://events.example.test/ingest",
      },
      vi.fn(async () => new Response(null, { status: 429 })),
    );
    await expect(sink?.deliver(event())).resolves.toEqual({
      errorCode: "http_429",
      kind: "failed",
      retryable: true,
    });
  });
});

function event(): BillingProductEventLease {
  return {
    attemptCount: 1,
    eventName: "hire_created",
    hireId: "hire_1",
    id: "event_1",
    idempotencyKey: "event-key-1",
    leaseToken: "lease_1",
    occurredAt: new Date("2026-08-25T12:00:00.000Z"),
    properties: { planId: "plan_1" },
    providerCheckoutId: null,
    providerEventId: null,
    providerPaymentId: null,
    providerSubscriptionId: null,
    requestId: "request_1",
    storeId: "store_1",
    tenantId: "tenant_1",
  };
}
