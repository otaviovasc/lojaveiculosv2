import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmExternalBotIntegrationRepository } from "../adapters/memory/crmExternalBotIntegrationRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmOutboundIntentRepository } from "../adapters/memory/crmOutboundIntentRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createTestCrmConnectionRepository } from "../../../domains/crm/testSupportConnections.js";
import { createTestCrmRoutingPorts } from "../../../domains/crm/testSupportConnections.js";
import { sendMessage } from "../../../domains/crm/services/CrmMessagingService/sendMessage.js";
import { CrmMessagingGatewayError } from "../../../domains/crm/ports/crmMessagingGateway.js";
import {
  connection,
  context,
  storeId,
  tenantId,
} from "./crm.messages.outboundIdempotency.testSupport.js";

describe("sendWhatsappOutboundMessage failure classification", () => {
  it("does not re-send a deterministic provider rejection", async () => {
    const repository = createMemoryCrmConversationRepository();
    const seeded = await repository.ingestMessage({
      customerPhone: "5511999999999",
      channel: "WHATSAPP",
      connectionId: "connection_1",
      content: "inbound",
      direction: "INBOUND",
      externalId: "incoming_failure_classification",
      metadata: {},
      providerTimestamp: new Date(),
      senderOrigin: "customer",
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    const sendText = vi.fn(async () => {
      throw new CrmMessagingGatewayError(
        "Provider rejected the message",
        502,
        undefined,
        "provider_rejected",
      );
    });
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
      idempotencyKey: "terminal-provider-rejection",
      cycleId: seeded.conversationCycle.id,
      text: "hello",
    };

    await expect(sendMessage(context(), input, ports)).rejects.toMatchObject({
      code: "provider_rejected",
    });
    await expect(sendMessage(context(), input, ports)).rejects.toMatchObject({
      code: "provider_rejected",
    });
    expect(sendText).toHaveBeenCalledTimes(1);
  });
});
