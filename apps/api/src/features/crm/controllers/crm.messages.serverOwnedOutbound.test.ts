import { describe, expect, it, vi } from "vitest";
import { createTestCrmConnectionRepository } from "../../../domains/crm/testSupportConnections.js";
import { createTestCrmRoutingPorts } from "../../../domains/crm/testSupportConnections.js";
import { sendMessage } from "../../../domains/crm/services/CrmMessagingService/sendMessage.js";
import { createMemoryCrmExternalBotIntegrationRepository } from "../adapters/memory/crmExternalBotIntegrationRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmOutboundIntentRepository } from "../adapters/memory/crmOutboundIntentRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import {
  connection,
  serverContext,
  storeId,
  tenantId,
} from "./crm.messages.outboundIdempotency.testSupport.js";

describe("CRM server-owned outbound messages", () => {
  it.each([
    ["scheduler", "system", "system", "SYSTEM"],
    ["external bot", "integration", "external_bot", "AI"],
  ] as const)(
    "allows a server-owned %s context to send without manager assignment",
    async (_source, actorKind, senderOrigin, senderType) => {
      const repository = createMemoryCrmConversationRepository();
      const seeded = await repository.ingestMessage({
        customerPhone: "5511999999998",
        channel: "WHATSAPP",
        connectionId: "connection_1",
        content: "inbound",
        direction: "INBOUND",
        externalId: `incoming-${actorKind}`,
        metadata: {},
        providerTimestamp: new Date(),
        senderOrigin: "customer",
        senderType: "CUSTOMER",
        status: "DELIVERED",
        storeId,
        tenantId,
        type: "TEXT",
      });
      await repository.updateConversationCycle({
        assignedUserId: "other-user" as never,
        cycleId: seeded.conversationCycle.id,
        storeId,
        tenantId,
      });
      const sendText = vi.fn(async () => ({
        externalId: `provider-${actorKind}`,
        providerTimestamp: new Date("2026-08-10T12:00:00.000Z"),
      }));
      const ports = {
        crmExternalBotIntegrationRepository:
          createMemoryCrmExternalBotIntegrationRepository(),
        crmConnectionRepository: createTestCrmConnectionRepository([
          connection(),
        ]),
        ...createTestCrmRoutingPorts([connection()]),
        crmRepository: createMemoryCrmRepository(),
        crmMessagingGateway: { sendText } as never,
        crmOutboundIntentRepository: createMemoryCrmOutboundIntentRepository(),
        crmConversationRepository: repository,
      };

      await expect(
        sendMessage(
          serverContext(actorKind),
          {
            idempotencyKey: `server-owned-${actorKind}`,
            senderOrigin,
            senderType,
            cycleId: seeded.conversationCycle.id,
            text: "server-owned",
          },
          ports,
        ),
      ).resolves.toMatchObject({ externalId: `provider-${actorKind}` });
      const [cycle] = await repository.listConversationCycles({
        limit: 1,
        offset: 0,
        cycleId: seeded.conversationCycle.id,
        storeId,
        tenantId,
      });
      expect(cycle?.assignedUserId).toBe("other-user");
      expect(sendText).toHaveBeenCalledOnce();
    },
  );
});
