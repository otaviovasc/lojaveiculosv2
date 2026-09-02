import { describe, expect, it, vi } from "vitest";
import { configureUazapiWebhooks } from "./uazapiCrmWhatsappWebhookActions.js";
import type { UazapiCredentials } from "./uazapiCrmWhatsappGatewaySupport.js";

const credentials: UazapiCredentials = {
  apiBaseUrl: "https://free.uazapi.com",
  instanceId: "instance-1",
  instanceToken: "instance-token-1",
};

describe("configureUazapiWebhooks", () => {
  it("creates a webhook without an id when the URL is not registered", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async (_request, init) =>
        init?.method === "GET"
          ? Response.json([])
          : Response.json({ success: true }),
      );

    const result = await configureUazapiWebhooks(credentials, fetch, {
      webhooks: [
        { type: "received", url: "https://app.test/webhook?token=secret" },
      ],
    });

    expect(result.results[0]).toMatchObject({ ok: true, verified: true });
    const [createUrl, createInit] = fetch.mock.calls[1] ?? [];
    expect(createUrl).toBe("https://free.uazapi.com/webhook");
    expect(createInit?.method).toBe("POST");
    expect(new Headers(createInit?.headers).get("token")).toBe(
      "instance-token-1",
    );
    expect(JSON.parse(String(createInit?.body))).toEqual({
      url: "https://app.test/webhook?token=secret",
      events: ["messages", "messages_update", "connection"],
      excludeMessages: ["wasSentByApi"],
      enabled: true,
      addUrlEvents: false,
      addUrlTypesMessages: false,
    });
  });

  it("updates the existing webhook matched by URL after stripping the token param", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async (_request, init) =>
        init?.method === "GET"
          ? Response.json({
              webhooks: [
                {
                  id: "provider-webhook-1",
                  url: "https://app.test/webhook?token=old-secret",
                  enabled: true,
                },
              ],
            })
          : Response.json({ success: true }),
      );

    const result = await configureUazapiWebhooks(credentials, fetch, {
      webhooks: [
        { type: "received", url: "https://app.test/webhook?token=new-secret" },
      ],
    });

    expect(result.results[0]?.ok).toBe(true);
    const body = JSON.parse(String(fetch.mock.calls[1]?.[1]?.body)) as Record<
      string,
      unknown
    >;
    expect(body.id).toBe("provider-webhook-1");
    expect(body.url).toBe("https://app.test/webhook?token=new-secret");
  });

  it("captures provider failures per webhook without throwing", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async (_request, init) =>
        init?.method === "GET"
          ? Response.json([])
          : Response.json({ error: true, message: "boom" }),
      );

    const result = await configureUazapiWebhooks(credentials, fetch, {
      webhooks: [{ type: "received", url: "https://app.test/webhook" }],
    });

    expect(result.results[0]).toMatchObject({
      error: "UAZAPI webhook registration failed: boom",
      ok: false,
      status: 200,
    });
  });

  it("fails the result when the webhook list cannot be read", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response("nope", { status: 401 }),
    );

    const result = await configureUazapiWebhooks(credentials, fetch, {
      webhooks: [{ type: "received", url: "https://app.test/webhook" }],
    });

    expect(result.results[0]).toMatchObject({
      error: "UAZAPI webhook list failed with HTTP 401",
      ok: false,
      status: null,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
