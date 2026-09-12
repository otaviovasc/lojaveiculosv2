import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
import { CrmMessagingGatewayError } from "../../domains/crm/ports/crmMessagingGateway.js";
import { createComposioCrmMessagingGateway } from "./composioCrmMessagingGateway.js";
import { executeComposioProxy } from "./composioCrmProxyClient.js";
import { resolveComposioCrmCredentials } from "./composioCrmMessagingGatewaySupport.js";

const env = {
  COMPOSIO_API_KEY: "secret-api-key",
  COMPOSIO_API_BASE_URL: "https://composio.test/",
};

describe("Composio CRM messaging gateway", () => {
  it("sends official WhatsApp text through the authenticated proxy", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json({
        data: { messages: [{ id: "wamid.official-1" }] },
        headers: {},
        status: 200,
      }),
    );
    const gateway = createComposioCrmMessagingGateway(env, fetchImpl);

    const result = await gateway.sendText(createConnection("whatsapp"), {
      phone: "5511999999999",
      text: "Olá",
    });

    expect(result.externalId).toBe("wamid.official-1");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, request] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe("https://composio.test/api/v3.1/tools/execute/proxy");
    expect(request?.headers).toMatchObject({
      "x-api-key": "secret-api-key",
    });
    expect(JSON.parse(String(request?.body))).toEqual({
      body: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        text: { body: "Olá", preview_url: false },
        to: "5511999999999",
        type: "text",
      },
      connected_account_id: "ca_official_1",
      endpoint: "https://graph.facebook.com/v25.0/phone-number-id-1/messages",
      method: "POST",
    });
  });

  it("uses the Instagram messaging payload for customer-initiated conversationCycles", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json({
        data: { message_id: "ig-message-1" },
        headers: {},
        status: 200,
      }),
    );
    const gateway = createComposioCrmMessagingGateway(env, fetchImpl);

    await gateway.sendText(createConnection("instagram"), {
      phone: "ig-scoped-user-1",
      text: "Olá pelo Instagram",
    });

    const request = JSON.parse(
      String(fetchImpl.mock.calls[0]?.[1]?.body),
    ) as Record<string, unknown>;
    expect(request.body).toEqual({
      message: { text: "Olá pelo Instagram" },
      recipient: { id: "ig-scoped-user-1" },
    });
    expect(request.endpoint).toBe(
      "https://graph.facebook.com/v25.0/instagram-account-id-1/messages",
    );
  });

  it("sends an approved WhatsApp template with its exact Meta parameters", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json({
        data: { messages: [{ id: "wamid.template-1" }] },
        headers: {},
        status: 200,
      }),
    );
    const gateway = createComposioCrmMessagingGateway(env, fetchImpl);

    const result = await gateway.sendTemplate(createConnection("whatsapp"), {
      components: [
        {
          parameters: [{ text: "Ana", type: "text" }],
          type: "body",
        },
      ],
      languageCode: "pt_BR",
      name: "primeiro_contato",
      phone: "5511999999999",
    });

    expect(result.externalId).toBe("wamid.template-1");
    const request = JSON.parse(
      String(fetchImpl.mock.calls[0]?.[1]?.body),
    ) as Record<string, unknown>;
    expect(request).toMatchObject({
      body: {
        messaging_product: "whatsapp",
        template: {
          components: [
            {
              parameters: [{ text: "Ana", type: "text" }],
              type: "body",
            },
          ],
          language: { code: "pt_BR" },
          name: "primeiro_contato",
        },
        to: "5511999999999",
        type: "template",
      },
      connected_account_id: "ca_official_1",
      endpoint: "https://graph.facebook.com/v25.0/phone-number-id-1/messages",
      method: "POST",
    });
  });

  it("never retries ambiguous upstream failures", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json({ data: {}, headers: {}, status: 503 }),
    );

    await expect(
      executeComposioProxy(
        resolveComposioCrmCredentials(createConnection("whatsapp"), env),
        { body: {}, endpoint: "https://graph.facebook.com/test/messages" },
        fetchImpl,
        { maxRetries: 3, sleep: vi.fn() },
      ),
    ).rejects.toMatchObject({ status: 502 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries only explicit 429 responses with bounded Retry-After", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          data: {},
          headers: { "Retry-After": "2" },
          status: 429,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: { messages: [{ id: "wamid.after-rate-limit" }] },
          headers: {},
          status: 200,
        }),
      );
    const sleep = vi.fn(async () => undefined);

    const result = await executeComposioProxy(
      resolveComposioCrmCredentials(createConnection("whatsapp"), env),
      { body: {}, endpoint: "https://graph.facebook.com/test/messages" },
      fetchImpl,
      { maxRetries: 1, sleep },
    );

    expect(result).toEqual({
      messages: [{ id: "wamid.after-rate-limit" }],
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(2_000);
  });

  it("fails closed for unsupported Instagram capabilities", async () => {
    const gateway = createComposioCrmMessagingGateway(
      env,
      vi.fn() as unknown as typeof fetch,
    );
    const connection = createConnection("instagram");

    await expect(
      gateway.sendText(connection, {
        phone: "ig-user",
        replyToMessageId: "ig-parent",
        text: "reply",
      }),
    ).rejects.toBeInstanceOf(CrmMessagingGatewayError);
    await expect(
      gateway.sendMedia(connection, {
        mediaType: "document",
        mediaUrl: "https://cdn.example/document.pdf",
        phone: "ig-user",
      }),
    ).rejects.toBeInstanceOf(CrmMessagingGatewayError);
  });

  it("rejects raw provider secrets stored in connection metadata", () => {
    const connection = createConnection("whatsapp", {
      metadata: {
        nested: { accessToken: "must-not-be-stored" },
        graphVersion: "v25.0",
      },
    });

    expect(() => resolveComposioCrmCredentials(connection, env)).toThrow(
      "Raw provider credentials",
    );
  });
});

function createConnection(
  channel: "instagram" | "whatsapp",
  overrides: Partial<CrmConnection> = {},
): CrmConnection {
  return {
    broker: "composio",
    channel,
    credentialsRef: {
      composio: { connectedAccountId: "ca_official_1" },
      env: { apiKey: "COMPOSIO_API_KEY" },
      mode: "composio",
    },
    displayName: "Official messaging",
    externalConnectionId:
      channel === "instagram" ? "instagram-account-id-1" : "phone-number-id-1",
    externalInstanceId: null,
    id: "25000000-0000-4000-8000-000000000101",
    metadata: { graphVersion: "v25.0" },
    phone: channel === "whatsapp" ? "5511999999999" : null,
    provider: "meta_cloud",
    status: "active",
    storeId: "store_1" as StoreId,
    tenantId: "tenant_1" as TenantId,
    webhookUrl: null,
    ...overrides,
  };
}
