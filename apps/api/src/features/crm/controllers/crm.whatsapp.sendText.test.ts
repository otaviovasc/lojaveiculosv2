import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createConfiguredZapiTestConnection } from "./crm.whatsapp.connectionFixtures.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";

describe("CRM WhatsApp send text", () => {
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
      senderOrigin: "customer",
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
  return createConfiguredZapiTestConnection({
    id: connectionId,
    overrides,
    storeId,
    tenantId,
  });
}
