import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createConfiguredZapiTestConnection } from "./crm.channelConnections.testSupport.js";
import { createTestApp } from "./crm.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";

describe("CRM send text", () => {
  it("sends quoted text replies with the provider message id", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await conversationRepository.ingestMessage({
      customerDisplayName: "Ana",
      customerPhone: "5511999999999",
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
      actorDisplayName: "Otavio Vasconcelos",
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmMessagingGateway: {
        sendText,
      },
      crmConversationRepository: conversationRepository,
    });

    const response = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/messages`,
      {
        body: JSON.stringify({
          content: "Sim, esta disponivel.",
          replyToMessageId: inbound.message.id,
        }),
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "composer-text-1",
        },
        method: "POST",
      },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      clientRequestId: "composer-text-1",
      content: "Sim, esta disponivel.",
      metadata: {
        replyTo: {
          content: "Ainda esta disponivel?",
          externalId: "zapi-inbound-quote-1",
          id: inbound.message.id,
        },
      },
      senderUser: {
        id: "02020202-0202-4202-8202-020202020202",
        name: "Otavio Vasconcelos",
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

  it("includes the canonical sender in quoted human message metadata", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const quoted = await conversationRepository.ingestMessage({
      customerPhone: "5511999999999",
      channel: "WHATSAPP",
      connectionId,
      content: "Vou verificar.",
      direction: "OUTBOUND",
      externalId: "zapi-human-quote-1",
      metadata: {
        authorName: "Maria Silva",
        sentByActorId: "user_maria",
      },
      providerTimestamp: new Date("2026-07-02T19:00:00.000Z"),
      senderOrigin: "human_crm",
      senderType: "HUMAN",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    const app = createTestApp({
      actorDisplayName: "Otavio Vasconcelos",
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmMessagingGateway: {
        sendText: vi.fn(async () => ({
          externalId: "zapi-reply-2",
          providerTimestamp: new Date("2026-07-02T19:02:00.000Z"),
        })),
      },
      crmConversationRepository: conversationRepository,
    });

    const response = await app.request(
      `/api/v1/crm/conversation-cycles/${quoted.conversationCycle.id}/messages`,
      {
        body: JSON.stringify({
          content: "Conferido.",
          replyToMessageId: quoted.message.id,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      metadata: {
        replyTo: {
          id: quoted.message.id,
          senderOrigin: "human_crm",
          senderUser: { id: "user_maria", name: "Maria Silva" },
        },
      },
    });
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
