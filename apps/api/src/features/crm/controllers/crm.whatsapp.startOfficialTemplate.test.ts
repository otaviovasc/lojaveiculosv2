import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "25000000-0000-4000-8000-000000000401";

describe("CRM official WhatsApp template conversation start", () => {
  it("persists a pending message before sending an approved template", async () => {
    const repository = createMemoryCrmWhatsappRepository();
    const sendTemplate = vi.fn(async () => ({
      externalId: "wamid.template-1",
      providerTimestamp: new Date("2026-07-27T12:00:00.000Z"),
      raw: { messages: [{ id: "wamid.template-1" }] },
    }));
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createConnection("composio_whatsapp"),
      ]),
      crmWhatsappGateway: { sendTemplate },
      crmWhatsappRepository: repository,
    });

    const response = await app.request(
      "/api/v1/crm/whatsapp/conversations/start",
      {
        body: JSON.stringify({
          connectionId,
          phone: "11999999999",
          template: {
            components: [
              {
                parameters: [{ text: "Maria", type: "text" }],
                type: "body",
              },
            ],
            languageCode: "pt_BR",
            name: "primeiro_contato",
          },
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      message: {
        channel: "WHATSAPP",
        content: "[template:primeiro_contato]",
        externalId: "wamid.template-1",
        status: "SENT",
        type: "TEMPLATE",
      },
    });
    expect(sendTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "composio_whatsapp" }),
      {
        components: [
          {
            parameters: [{ text: "Maria", type: "text" }],
            type: "body",
          },
        ],
        languageCode: "pt_BR",
        name: "primeiro_contato",
        phone: "5511999999999",
      },
    );
    const [session] = await repository.listSessions({
      limit: 10,
      offset: 0,
      storeId,
      tenantId,
    });
    expect(session?.channel).toBe("WHATSAPP");
  });

  it.each([
    [
      "composio_whatsapp",
      { text: "plain text" },
      "Official WhatsApp conversation starts require an approved template.",
    ],
    [
      "composio_instagram",
      {
        template: {
          languageCode: "pt_BR",
          name: "primeiro_contato",
        },
      },
      "Instagram conversations must be initiated by the customer.",
    ],
    [
      "zapi",
      {
        template: {
          languageCode: "pt_BR",
          name: "primeiro_contato",
        },
      },
      "Z-API conversation starts require a text message.",
    ],
  ] as const)(
    "rejects an invalid start mode for %s",
    async (provider, payload, message) => {
      const sendText = vi.fn();
      const sendTemplate = vi.fn();
      const app = createTestApp({
        crmConnectionRepository: createMemoryCrmConnectionRepository([
          createConnection(provider),
        ]),
        crmWhatsappGateway: { sendTemplate, sendText },
      });

      const response = await app.request(
        "/api/v1/crm/whatsapp/conversations/start",
        {
          body: JSON.stringify({
            connectionId,
            phone: "11999999999",
            ...payload,
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );

      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toMatchObject({ message });
      expect(sendText).not.toHaveBeenCalled();
      expect(sendTemplate).not.toHaveBeenCalled();
    },
  );

  it.each([
    {
      parameters: [{ nested: { arbitrary: true }, type: "text" }],
      type: "body",
    },
    {
      parameters: [
        { image: { link: "http://media.test/header.jpg" }, type: "image" },
      ],
      type: "header",
    },
    {
      parameters: [{ payload: "confirm", type: "payload" }],
      type: "button",
    },
  ])(
    "rejects unbounded or incomplete template component payloads",
    async (component) => {
      const sendTemplate = vi.fn();
      const app = createTestApp({
        crmConnectionRepository: createMemoryCrmConnectionRepository([
          createConnection("composio_whatsapp"),
        ]),
        crmWhatsappGateway: { sendTemplate },
      });

      const response = await app.request(
        "/api/v1/crm/whatsapp/conversations/start",
        {
          body: JSON.stringify({
            connectionId,
            phone: "11999999999",
            template: {
              components: [component],
              languageCode: "pt_BR",
              name: "primeiro_contato",
            },
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );

      expect(response.status).toBe(400);
      expect(sendTemplate).not.toHaveBeenCalled();
    },
  );
});

function createConnection(provider: CrmConnection["provider"]): CrmConnection {
  return {
    credentialsRef: {},
    displayName: provider,
    externalConnectionId: "sender-id",
    externalInstanceId: null,
    id: connectionId,
    metadata: {},
    phone: null,
    provider,
    status: "active",
    storeId,
    tenantId,
    webhookUrl: null,
  };
}
