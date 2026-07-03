import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  createAuditSpy,
  createTestApp,
} from "./crm.whatsapp.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";

describe("CRM WhatsApp send text", () => {
  it("sends through ZAPI and stores the outbound message in CRM", async () => {
    const { audit, record } = createAuditSpy();
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const inbound = await whatsappRepository.ingestMessage({
      buyerName: "Ana",
      buyerPhone: "5511999999999",
      channel: "WHATSAPP",
      connectionId,
      content: "Ola",
      direction: "INBOUND",
      externalId: "inbound-1",
      metadata: {},
      providerTimestamp: new Date("2026-07-02T19:00:00.000Z"),
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    const sendText = vi.fn(async () => ({
      externalId: "zapi-outbound-1",
      providerTimestamp: new Date("2026-07-02T19:01:00.000Z"),
      raw: { messageId: "zapi-outbound-1" },
    }));
    const app = createTestApp({
      audit,
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappGateway: {
        getConnectionStatus: vi.fn(),
        sendMedia: vi.fn(),
        sendText,
      },
      crmWhatsappRepository: whatsappRepository,
    });

    const response = await app.request("/api/v1/crm/whatsapp/send/text", {
      body: JSON.stringify({
        sessionId: inbound.session.id,
        text: "Podemos conversar pelo WhatsApp.",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      content: "Podemos conversar pelo WhatsApp.",
      direction: "OUTBOUND",
      externalId: "zapi-outbound-1",
      senderType: "HUMAN",
      status: "SENT",
      type: "TEXT",
    });
    expect(sendText).toHaveBeenCalledWith(
      expect.objectContaining({ id: connectionId, provider: "zapi" }),
      {
        phone: "5511999999999",
        text: "Podemos conversar pelo WhatsApp.",
      },
    );

    const messages = await whatsappRepository.listMessages({
      limit: 10,
      offset: 0,
      sessionId: inbound.session.id,
      storeId,
      tenantId,
    });
    expect(messages.map((message) => message.direction)).toEqual([
      "OUTBOUND",
      "INBOUND",
    ]);
    expect(record.mock.calls.map((call) => call[0].outcome)).toEqual([
      "attempted",
      "succeeded",
    ]);
    expect(record.mock.calls[0]?.[0]).toMatchObject({
      action: "crm.whatsapp.message.send_text",
      entityId: inbound.session.id,
    });
  });

  it("sends quoted text replies with the provider message id", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const inbound = await whatsappRepository.ingestMessage({
      buyerName: "Ana",
      buyerPhone: "5511999999999",
      channel: "WHATSAPP",
      connectionId,
      content: "Ainda esta disponivel?",
      direction: "INBOUND",
      externalId: "zapi-inbound-quote-1",
      metadata: {},
      providerTimestamp: new Date("2026-07-02T19:00:00.000Z"),
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    const sendText = vi.fn(async () => ({
      externalId: "zapi-reply-1",
      providerTimestamp: new Date("2026-07-02T19:02:00.000Z"),
      raw: { messageId: "zapi-reply-1" },
    }));
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappGateway: {
        sendText,
      },
      crmWhatsappRepository: whatsappRepository,
    });

    const response = await app.request("/api/v1/crm/whatsapp/send/text", {
      body: JSON.stringify({
        replyToMessageId: inbound.message.id,
        sessionId: inbound.session.id,
        text: "Sim, esta disponivel.",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      content: "Sim, esta disponivel.",
      metadata: {
        replyTo: {
          content: "Ainda esta disponivel?",
          externalId: "zapi-inbound-quote-1",
          id: inbound.message.id,
        },
      },
    });
    expect(sendText).toHaveBeenCalledWith(
      expect.objectContaining({ id: connectionId, provider: "zapi" }),
      {
        phone: "5511999999999",
        replyToMessageId: "zapi-inbound-quote-1",
        text: "Sim, esta disponivel.",
      },
    );
  });
});

function createZapiConnection(
  overrides: Partial<CrmConnection> = {},
): CrmConnection {
  return {
    credentialsRef: {},
    displayName: "ZAPI Test Connection",
    externalConnectionId: null,
    externalInstanceId: null,
    id: connectionId,
    metadata: {},
    phone: null,
    provider: "zapi",
    status: "sandbox",
    storeId,
    tenantId,
    webhookUrl: null,
    ...overrides,
  };
}
