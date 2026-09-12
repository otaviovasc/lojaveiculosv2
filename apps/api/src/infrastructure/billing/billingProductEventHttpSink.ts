import type {
  BillingProductEventLease,
  BillingProductEventSink,
} from "../../domains/billing/ports/billingProductEventDelivery.js";

type Fetch = typeof globalThis.fetch;

export function createBillingProductEventHttpSink(
  env: NodeJS.ProcessEnv,
  fetchImpl: Fetch = globalThis.fetch,
): BillingProductEventSink | undefined {
  const rawUrl = env.BILLING_PRODUCT_EVENT_SINK_URL?.trim();
  if (!rawUrl) return undefined;
  const token = env.BILLING_PRODUCT_EVENT_SINK_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "BILLING_PRODUCT_EVENT_SINK_TOKEN is required when the billing product-event sink is configured.",
    );
  }
  const url = parseSinkUrl(rawUrl, env.APP_ENV ?? env.NODE_ENV ?? "local");
  const timeoutMs = positiveInt(
    env.BILLING_PRODUCT_EVENT_SINK_TIMEOUT_MS,
    5_000,
  );
  return {
    async deliver(event) {
      try {
        const response = await fetchImpl(url, {
          body: JSON.stringify(toDeliveryPayload(event)),
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
            "idempotency-key": event.idempotencyKey,
          },
          method: "POST",
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (response.ok) return { kind: "delivered" };
        return {
          errorCode: `http_${response.status}`,
          kind: "failed",
          retryable:
            response.status === 408 ||
            response.status === 425 ||
            response.status === 429 ||
            response.status >= 500,
        };
      } catch (error) {
        return {
          errorCode:
            error instanceof Error && error.name === "TimeoutError"
              ? "timeout"
              : "network_error",
          kind: "failed",
          retryable: true,
        };
      }
    },
  };
}

function parseSinkUrl(rawUrl: string, environment: string): URL {
  const url = new URL(rawUrl);
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(
      "Billing product-event sink URL must not contain credentials, query, or fragment.",
    );
  }
  const localHttp =
    environment === "local" &&
    url.protocol === "http:" &&
    (url.hostname === "127.0.0.1" || url.hostname === "localhost");
  if (url.protocol !== "https:" && !localHttp) {
    throw new Error("Billing product-event sink URL must use HTTPS.");
  }
  return url;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toDeliveryPayload(event: BillingProductEventLease) {
  return {
    event: {
      eventName: event.eventName,
      hireId: event.hireId,
      id: event.id,
      occurredAt: event.occurredAt.toISOString(),
      properties: event.properties,
      providerCheckoutId: event.providerCheckoutId,
      providerEventId: event.providerEventId,
      providerPaymentId: event.providerPaymentId,
      providerSubscriptionId: event.providerSubscriptionId,
      requestId: event.requestId,
      storeId: event.storeId,
      tenantId: event.tenantId,
    },
    schemaVersion: "billing-product-event.v1",
  };
}
