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
  it("PUTs each event to its matching ZAPI update-webhook endpoint", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(
        async () => new Response(JSON.stringify({ value: true })),
      );

    const result = await configureZapiWebhooks(credentials, fetch, {
      webhooks: [
        { type: "received", url: "https://app.test/received?token=t" },
        { type: "status", url: "https://app.test/status?token=t" },
        {
          type: "chat-presence",
          url: "https://app.test/chat-presence?token=t",
        },
      ],
    });

    expect(result.results.every((entry) => entry.ok)).toBe(true);
    expect(fetch.mock.calls.map((call) => call[0])).toEqual([
      `${instanceBase}/update-webhook-received`,
      `${instanceBase}/update-webhook-message-status`,
      `${instanceBase}/update-webhook-chat-presence`,
    ]);

    const firstInit = fetch.mock.calls[0]?.[1];
    expect(firstInit?.method).toBe("PUT");
    expect((firstInit?.headers as Record<string, string>)["Client-Token"]).toBe(
      "client-token-1",
    );
    expect(JSON.parse(String(firstInit?.body))).toEqual({
      value: "https://app.test/received?token=t",
    });
  });

  it("captures per-webhook failures without throwing", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response("nope", { status: 401 }));

    const result = await configureZapiWebhooks(credentials, fetch, {
      webhooks: [{ type: "received", url: "https://app.test/received" }],
    });

    expect(result.results[0]?.ok).toBe(false);
    expect(result.results[0]?.status).toBe(401);
    expect(result.results[0]?.error).toContain("HTTP 401");
  });
});
