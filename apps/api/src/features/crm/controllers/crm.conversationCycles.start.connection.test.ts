import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createConfiguredZapiTestConnection } from "./crm.channelConnections.testSupport.js";
import { createZapiConnection } from "./crm.messaging.testSupport.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import { requestStartConversation } from "./crm.startConversation.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const secondConnectionId = "24000000-0000-4000-8000-000000000102";

describe("CRM start conversation connection selection", () => {
  it("starts the conversation on the client-supplied connection", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const sendText = vi.fn(async () => ({
      externalId: "zapi-start-explicit",
      providerTimestamp: new Date("2026-07-03T15:00:00.000Z"),
      raw: { messageId: "zapi-start-explicit" },
    }));
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
        createConfiguredZapiTestConnection({
          id: secondConnectionId,
          overrides: { phone: "5511888888888" },
          storeId,
          tenantId,
        }),
      ]),
      crmRepository: createMemoryCrmRepository(),
      crmMessagingGateway: { sendText },
      crmConversationRepository: conversationRepository,
    });

    const response = await requestStartConversation(app, {
      channel: "whatsapp",
      connectionId: secondConnectionId,
      recipientAddress: "(11) 99999-9999",
      text: "Ola, tudo bem?",
    });

    expect(response.status).toBe(201);
    expect(sendText).toHaveBeenCalledWith(
      expect.objectContaining({ id: secondConnectionId, provider: "zapi" }),
      { phone: "5511999999999", text: "Ola, tudo bem?" },
    );
  });

  it.each([
    ["an unknown connection", "24000000-0000-4000-8000-000000000199"],
    ["a connection from another store", "24000000-0000-4000-8000-000000000198"],
  ] as const)(
    "rejects %s before creating lead or message state",
    async (_label, requestedConnectionId) => {
      const crmRepository = createMemoryCrmRepository();
      const conversationRepository = createMemoryCrmConversationRepository();
      const sendText = vi.fn();
      const foreignConnection = createConfiguredZapiTestConnection({
        id: "24000000-0000-4000-8000-000000000198",
        overrides: { phone: "5511777777777" },
        storeId: "store_other" as StoreId,
        tenantId,
      });
      const app = createTestApp({
        crmConnectionRepository: createMemoryCrmConnectionRepository([
          createZapiConnection(),
          foreignConnection,
        ]),
        crmRepository,
        crmMessagingGateway: { sendText },
        crmConversationRepository: conversationRepository,
      });

      const response = await requestStartConversation(app, {
        channel: "whatsapp",
        connectionId: requestedConnectionId,
        recipientAddress: "5511999999999",
        text: "Não deve sair.",
      });

      expect(response.status).toBe(422);
      await expect(
        crmRepository.listLeads({ limit: 10, offset: 0, storeId, tenantId }),
      ).resolves.toEqual([]);
      await expect(
        conversationRepository.listConversationCycles({
          limit: 10,
          offset: 0,
          storeId,
          tenantId,
        }),
      ).resolves.toEqual([]);
      expect(sendText).not.toHaveBeenCalled();
    },
  );

  it("rejects a connectionId that is not a uuid", async () => {
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmRepository: createMemoryCrmRepository(),
      crmConversationRepository: createMemoryCrmConversationRepository(),
    });

    const response = await requestStartConversation(app, {
      channel: "whatsapp",
      connectionId: "not-a-uuid",
      recipientAddress: "5511999999999",
      text: "Não deve sair.",
    });

    expect(response.status).toBe(400);
  });
});
