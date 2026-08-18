import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import {
  createOfficialTemplateConnection,
  createOfficialTemplateRouting,
} from "./crm.whatsapp.startOfficialTemplate.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "25000000-0000-4000-8000-000000000401";

describe("CRM official WhatsApp template conversation start", () => {
  it("persists a pending message before sending an approved template", async () => {
    const repository = createMemoryCrmConversationRepository();
    const sendTemplate = vi.fn(async () => ({
      externalId: "wamid.template-1",
      providerTimestamp: new Date("2026-07-27T12:00:00.000Z"),
      raw: { messages: [{ id: "wamid.template-1" }] },
    }));
    const routing = createOfficialTemplateRouting(
      "meta_cloud",
      "whatsapp",
      connectionId,
      storeId,
      tenantId,
    );
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createOfficialTemplateConnection(
          "meta_cloud",
          "whatsapp",
          connectionId,
          storeId,
          tenantId,
        ),
      ]),
      crmMessagingGateway: { sendTemplate },
      crmConversationRepository: repository,
      crmRoutingConnectionRepository: routing.connectionRepository,
      crmRoutingPolicyRepository: routing.policyRepository,
    });

    const response = await app.request("/api/v1/crm/conversation-cycles", {
      body: JSON.stringify({
        channel: "whatsapp",
        recipientAddress: "11999999999",
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
    });

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
      expect.objectContaining({
        broker: "composio",
        channel: "whatsapp",
        provider: "meta_cloud",
      }),
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
    const [cycle] = await repository.listConversationCycles({
      limit: 10,
      offset: 0,
      storeId,
      tenantId,
    });
    expect(cycle?.channel).toBe("WHATSAPP");
  });

  it.each([
    [
      "meta_cloud",
      "whatsapp",
      { text: "plain text" },
      "Official WhatsApp conversation starts require an approved template.",
    ],
    [
      "meta_cloud",
      "instagram",
      { text: "plain text" },
      "Instagram conversations must be initiated by the customer.",
    ],
    [
      "zapi",
      "whatsapp",
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
    async (provider, channel, payload, message) => {
      const sendText = vi.fn();
      const sendTemplate = vi.fn();
      const routing = createOfficialTemplateRouting(
        provider,
        channel,
        connectionId,
        storeId,
        tenantId,
      );
      const app = createTestApp({
        crmConnectionRepository: createMemoryCrmConnectionRepository([
          createOfficialTemplateConnection(
            provider,
            channel,
            connectionId,
            storeId,
            tenantId,
          ),
        ]),
        crmMessagingGateway: { sendTemplate, sendText },
        crmRoutingConnectionRepository: routing.connectionRepository,
        crmRoutingPolicyRepository: routing.policyRepository,
      });

      const response = await app.request("/api/v1/crm/conversation-cycles", {
        body: JSON.stringify({
          channel,
          recipientAddress: "11999999999",
          ...payload,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
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
      const routing = createOfficialTemplateRouting(
        "meta_cloud",
        "whatsapp",
        connectionId,
        storeId,
        tenantId,
      );
      const app = createTestApp({
        crmConnectionRepository: createMemoryCrmConnectionRepository([
          createOfficialTemplateConnection(
            "meta_cloud",
            "whatsapp",
            connectionId,
            storeId,
            tenantId,
          ),
        ]),
        crmMessagingGateway: { sendTemplate },
        crmRoutingConnectionRepository: routing.connectionRepository,
        crmRoutingPolicyRepository: routing.policyRepository,
      });

      const response = await app.request("/api/v1/crm/conversation-cycles", {
        body: JSON.stringify({
          channel: "whatsapp",
          recipientAddress: "11999999999",
          template: {
            components: [component],
            languageCode: "pt_BR",
            name: "primeiro_contato",
          },
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });

      expect(response.status).toBe(400);
      expect(sendTemplate).not.toHaveBeenCalled();
    },
  );
});
