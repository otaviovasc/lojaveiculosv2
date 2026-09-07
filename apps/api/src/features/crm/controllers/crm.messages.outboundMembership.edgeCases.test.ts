import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createConfiguredZapiTestConnection } from "./crm.channelConnections.testSupport.js";
import { createTestApp } from "./crm.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";

describe("CRM outbound membership edge cases", () => {
  it("allows global manager actor to send without per-connection membership", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await conversationRepository.ingestMessage({
      customerDisplayName: "Cliente Teste",
      customerPhone: "5511999999999",
      channel: "WHATSAPP",
      connectionId,
      content: "Ola",
      direction: "INBOUND",
      externalId: "inbound-msg-3",
      metadata: {},
      providerTimestamp: new Date(),
      senderOrigin: "customer",
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    const sendText = vi.fn(async () => ({
      externalId: "zapi-reply-3",
      providerTimestamp: new Date(),
      raw: {},
    }));
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createConfiguredZapiTestConnection({
          id: connectionId,
          storeId,
          tenantId,
        }),
      ]),
      crmMessagingGateway: { sendText },
      crmConversationRepository: conversationRepository,
      permissions: ["crm.conversations.assign", "crm.messages.send"],
    });

    const response = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/messages`,
      {
        body: JSON.stringify({ content: "Resposta gerencial" }),
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "idemp-manager-1",
        },
        method: "POST",
      },
    );

    expect(response.status).toBe(201);
    expect(sendText).toHaveBeenCalledTimes(1);
  });

  it("fails closed when restricted outbound access has no membership adapter", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await conversationRepository.ingestMessage({
      customerDisplayName: "Cliente Teste",
      customerPhone: "5511999999999",
      channel: "WHATSAPP",
      connectionId,
      content: "Ola",
      direction: "INBOUND",
      externalId: "inbound-msg-no-membership-adapter",
      metadata: {},
      providerTimestamp: new Date(),
      senderOrigin: "customer",
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    const sendText = vi.fn();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createConfiguredZapiTestConnection({
          id: connectionId,
          storeId,
          tenantId,
        }),
      ]),
      crmMessagingGateway: { sendText },
      crmConversationRepository: conversationRepository,
      permissions: ["crm.conversations.read", "crm.messages.send"],
    });

    const response = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/messages`,
      {
        body: JSON.stringify({ content: "Mensagem sem escopo" }),
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "idemp-no-membership-adapter",
        },
        method: "POST",
      },
    );

    expect(response.status).toBe(404);
    expect(sendText).not.toHaveBeenCalled();
  });
});
