import { describe, expect, it, vi } from "vitest";
import { createOneSignalHttpClient } from "./onesignalHttpClient.js";

const delivery = {
  body: "Nova mensagem",
  data: { cycleId: "cycle" },
  heading: "Cliente",
  iconUrl: "https://app.test/icon.png",
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
  subscriptionIds: ["sub-a"],
  topic: "crm-topic",
  ttlSeconds: 86_400,
  webUrl: "https://app.test/#/crm?cycleId=cycle",
};

describe("OneSignal HTTP client", () => {
  it("sends the stable V1-compatible web push payload", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: "notification-id" }), {
        status: 200,
      }),
    );
    const provider = createOneSignalHttpClient({
      apiKey: "server-secret",
      appId: "app-id",
      fetch,
      requestTimeoutMs: 1_000,
    });

    await expect(provider.send(delivery)).resolves.toEqual({
      invalidSubscriptionIds: [],
      kind: "accepted",
      providerNotificationId: "notification-id",
    });
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe("https://api.onesignal.com/notifications?c=push");
    expect(init?.headers).toEqual({
      Authorization: "Key server-secret",
      "Content-Type": "application/json",
    });
    expect(init?.redirect).toBe("error");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      app_id: "app-id",
      idempotency_key: delivery.idempotencyKey,
      include_subscription_ids: ["sub-a"],
      target_channel: "push",
      ttl: 86_400,
      web_url: delivery.webUrl,
      web_push_topic: "crm-topic",
    });
  });

  it("classifies rate limits as retryable and honors Retry-After", async () => {
    const provider = createOneSignalHttpClient({
      apiKey: "server-secret",
      appId: "app-id",
      fetch: vi.fn().mockResolvedValue(
        new Response("{}", {
          headers: { "retry-after": "12" },
          status: 429,
        }),
      ),
      requestTimeoutMs: 1_000,
    });
    await expect(provider.send(delivery)).resolves.toEqual({
      errorCode: "onesignal_http_429",
      kind: "retryable_failure",
      retryAfterMs: 12_000,
    });
  });

  it("retries an indeterminate success response without a notification id", async () => {
    const provider = createOneSignalHttpClient({
      apiKey: "server-secret",
      appId: "app-id",
      fetch: vi.fn().mockResolvedValue(new Response("{}", { status: 200 })),
      requestTimeoutMs: 1_000,
    });
    await expect(provider.send(delivery)).resolves.toEqual({
      errorCode: "onesignal_missing_notification_id",
      kind: "retryable_failure",
    });
  });

  it("returns invalid legacy subscription ids without logging request data", async () => {
    const provider = createOneSignalHttpClient({
      apiKey: "server-secret",
      appId: "app-id",
      fetch: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            errors: {
              invalid_player_ids: ["invalid-sub"],
              invalid_subscription_ids: ["current-invalid-sub"],
            },
          }),
          { status: 400 },
        ),
      ),
      requestTimeoutMs: 1_000,
    });
    await expect(provider.send(delivery)).resolves.toEqual({
      errorCode: "onesignal_http_400",
      invalidSubscriptionIds: ["invalid-sub", "current-invalid-sub"],
      kind: "permanent_failure",
    });
  });

  it("surfaces invalid subscriptions even when a 2xx response has no id", async () => {
    const provider = createOneSignalHttpClient({
      apiKey: "server-secret",
      appId: "app-id",
      fetch: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            errors: { invalid_subscription_ids: ["invalid-sub"] },
          }),
          { status: 200 },
        ),
      ),
      requestTimeoutMs: 1_000,
    });
    await expect(provider.send(delivery)).resolves.toEqual({
      errorCode: "onesignal_invalid_subscriptions",
      invalidSubscriptionIds: ["invalid-sub"],
      kind: "permanent_failure",
    });
  });

  it("bounds provider response bodies and classifies oversized success safely", async () => {
    const provider = createOneSignalHttpClient({
      apiKey: "server-secret",
      appId: "app-id",
      fetch: vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ padding: "x".repeat(70 * 1024) }), {
          status: 200,
        }),
      ),
      requestTimeoutMs: 1_000,
    });
    await expect(provider.send(delivery)).resolves.toEqual({
      errorCode: "onesignal_response_too_large",
      kind: "retryable_failure",
    });
  });
});
