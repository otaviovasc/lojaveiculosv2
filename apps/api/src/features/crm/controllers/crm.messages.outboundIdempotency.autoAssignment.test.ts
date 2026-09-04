import { describe, expect, it, vi } from "vitest";
import { sendMessage } from "../../../domains/crm/services/CrmMessagingService/sendMessage.js";
import { createTestCrmConnectionRepository } from "../../../domains/crm/testSupportConnections.js";
import { createTestCrmRoutingPorts } from "../../../domains/crm/testSupportConnections.js";
import { createMemoryCrmExternalBotIntegrationRepository } from "../adapters/memory/crmExternalBotIntegrationRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmOutboundIntentRepository } from "../adapters/memory/crmOutboundIntentRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import {
  connection,
  context,
  storeId,
  tenantId,
} from "./crm.messages.outboundIdempotency.testSupport.js";

describe("CRM outbound idempotency auto-assignment", () => {
  it("keeps automatic self-assignment idempotent with a completed outbound intent", async () => {
    const repository = createMemoryCrmConversationRepository();
    const seeded = await repository.ingestMessage({
      customerPhone: "5511999999999",
      channel: "WHATSAPP",
      connectionId: "connection_1",
      content: "inbound",
      direction: "INBOUND",
      externalId: "incoming-auto-assignment",
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
      externalId: "provider-auto-assignment",
      providerTimestamp: new Date(),
    }));
    const ports = {
      crmAssigneeMembershipRepository: {
        isActiveStoreMember: async () => true,
      },
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
    const input = {
      idempotencyKey: "human-auto-assignment",
      senderOrigin: "human_crm" as const,
      senderType: "HUMAN" as const,
      cycleId: seeded.conversationCycle.id,
      text: "hello",
    };

    await sendMessage(context(), input, ports);
    await sendMessage(context(), input, ports);

    const [cycle] = await repository.listConversationCycles({
      limit: 1,
      offset: 0,
      cycleId: seeded.conversationCycle.id,
      storeId,
      tenantId,
    });
    expect(cycle?.assignedUserId).toBe("user_1");
    expect(sendText).toHaveBeenCalledTimes(1);
  });
});
