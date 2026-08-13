import { describe, expect, it, vi } from "vitest";
import { configureZapiWebhooks } from "./zapiCrmWhatsappWebhookActions.js";
import type { ZapiCredentials } from "./zapiCrmWhatsappGatewaySupport.js";

const credentials: ZapiCredentials = {
  apiBaseUrl: "https://api.z-api.io",
  clientToken: "client-token-1",
  instanceId: "instance-1",
  instanceToken: "instance-token-1",
};

const instanceBase =
  "https://api.z-api.io/instances/instance-1/token/instance-token-1";

describe("configureZapiWebhooks", () => {
  it("owns the combined receive slot and verifies all canonical callbacks through /me", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async (request) =>
        String(request).endsWith("/me")
          ? Response.json(providerCallbacks())
          : Response.json({ value: true }),
      );

    const result = await configureZapiWebhooks(credentials, fetch, {
      webhooks: [
        {
          type: "chat-presence",
          url: "https://app.test/chat-presence?token=t",
        },
        { type: "connected", url: "https://app.test/connected?token=t" },
        { type: "delivery", url: "https://app.test/delivery?token=t" },
        {
          type: "disconnected",
          url: "https://app.test/disconnected?token=t",
        },
        { type: "received", url: "https://app.test/received?token=t" },
        { type: "status", url: "https://app.test/status?token=t" },
      ],
    });

    expect(result.results.every((entry) => entry.ok)).toBe(true);
    expect(fetch.mock.calls.map((call) => call[0])).toEqual([
      `${instanceBase}/update-webhook-chat-presence`,
      `${instanceBase}/update-webhook-connected`,
      `${instanceBase}/update-webhook-delivery`,
      `${instanceBase}/update-webhook-disconnected`,
      `${instanceBase}/update-webhook-received-delivery`,
      `${instanceBase}/update-webhook-received`,
      `${instanceBase}/update-webhook-message-status`,
      `${instanceBase}/me`,
    ]);
    expect(result.results).toHaveLength(6);
    expect(result.results.every((entry) => entry.verified)).toBe(true);

    const firstInit = fetch.mock.calls[0]?.[1];
    expect(firstInit?.method).toBe("PUT");
    expect((firstInit?.headers as Record<string, string>)["Client-Token"]).toBe(
      "client-token-1",
    );
    expect(JSON.parse(String(firstInit?.body))).toEqual({
      value: "https://app.test/chat-presence?token=t",
    });
  });

  it("captures per-webhook failures without throwing", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () => new Response("nope", { status: 401 }));

    const result = await configureZapiWebhooks(credentials, fetch, {
      webhooks: [{ type: "received", url: "https://app.test/received" }],
    });

    expect(result.results[0]?.ok).toBe(false);
    expect(result.results[0]?.status).toBe(401);
    expect(result.results[0]?.error).toContain("HTTP 401");
  });

  it("does not treat a rejected ZAPI acknowledgement as configured", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () => Response.json({ value: false }));

    const result = await configureZapiWebhooks(credentials, fetch, {
      webhooks: [{ type: "received", url: "https://app.test/received" }],
    });

    expect(result.results[0]).toMatchObject({
      error: "ZAPI webhook registration was not acknowledged",
      ok: false,
      status: 200,
      type: "received",
      verified: false,
    });
  });

  it("does not trust acknowledgements when /me readback is unavailable", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async (request) =>
        String(request).endsWith("/me")
          ? new Response("unavailable", { status: 503 })
          : Response.json({ value: true }),
      );

    const result = await configureZapiWebhooks(credentials, fetch, {
      webhooks: [{ type: "received", url: "https://app.test/received" }],
    });

    expect(result.results[0]).toMatchObject({
      error: "ZAPI webhook readback was unavailable",
      ok: false,
      status: 200,
      verified: false,
    });
  });

  it("requires the combined receive-delivery acknowledgement", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async (request) => {
        const url = String(request);
        if (url.endsWith("/update-webhook-received-delivery")) {
          return new Response("rejected", { status: 400 });
        }
        if (url.endsWith("/me")) return Response.json(providerCallbacks());
        return Response.json({ value: true });
      });

    const result = await configureZapiWebhooks(credentials, fetch, {
      webhooks: [
        { type: "received", url: "https://app.test/received?token=t" },
      ],
    });

    expect(result.results[0]).toMatchObject({
      error: "ZAPI webhook registration failed with HTTP 400",
      ok: false,
      status: 400,
      type: "received",
      verified: false,
    });
  });

  it("rejects acknowledged setup when the legacy combined slot leaves receive elsewhere", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async (request) =>
        String(request).endsWith("/me")
          ? Response.json({
              ...providerCallbacks(),
              receivedCallbackUrl: "https://legacy.test/receive",
            })
          : Response.json({ value: true }),
      );

    const result = await configureZapiWebhooks(credentials, fetch, {
      webhooks: allWebhooks(),
    });

    expect(result.results.filter((entry) => entry.ok)).toHaveLength(5);
    expect(
      result.results.find((entry) => entry.type === "received"),
    ).toMatchObject({
      error: "ZAPI webhook does not match provider readback",
      ok: false,
      verified: true,
    });
  });
});

function allWebhooks() {
  return [
    { type: "chat-presence", url: "https://app.test/chat-presence?token=t" },
    { type: "connected", url: "https://app.test/connected?token=t" },
    { type: "delivery", url: "https://app.test/delivery?token=t" },
    { type: "disconnected", url: "https://app.test/disconnected?token=t" },
    { type: "received", url: "https://app.test/received?token=t" },
    { type: "status", url: "https://app.test/status?token=t" },
  ];
}

function providerCallbacks() {
  return {
    connectedCallbackUrl: "https://app.test/connected?token=t",
    deliveryCallbackUrl: "https://app.test/delivery?token=t",
    disconnectedCallbackUrl: "https://app.test/disconnected?token=t",
    messageStatusCallbackUrl: "https://app.test/status?token=t",
    presenceChatCallbackUrl: "https://app.test/chat-presence?token=t",
    receivedCallbackUrl: "https://app.test/received?token=t",
  };
}
