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
  context,
  outboundConnectionMembership,
  storeId,
  tenantId,
} from "./crm.messages.outboundIdempotency.testSupport.js";

describe("CRM outbound provider preflight", () => {
  it("releases a fresh claim when connection preflight rejects before assignment", async () => {
    const repository = createMemoryCrmConversationRepository();
    const seeded = await repository.ingestMessage({
      customerPhone: "5511999999999",
      channel: "WHATSAPP",
      connectionId: "connection_1",
      content: "inbound",
      direction: "INBOUND",
      externalId: "incoming-preflight",
      metadata: {},
      providerTimestamp: new Date(),
      senderOrigin: "customer",
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    const intents = createMemoryCrmOutboundIntentRepository();
    const connectionRepository = createTestCrmConnectionRepository([
      { ...connection(), status: "paused" },
    ]);
    const sendText = vi.fn(async () => ({
      externalId: "provider-after-preflight",
      providerTimestamp: new Date("2026-08-10T12:00:00.000Z"),
    }));
    const ports = {
      crmAssigneeMembershipRepository: {
        isActiveStoreMember: async () => true,
      },
      crmExternalBotIntegrationRepository:
        createMemoryCrmExternalBotIntegrationRepository(),
      crmConnectionRepository: connectionRepository,
      crmConnectionMemberRepository: outboundConnectionMembership(),
      ...createTestCrmRoutingPorts([connection()]),
      crmRepository: createMemoryCrmRepository(),
      crmMessagingGateway: { sendText } as never,
      crmOutboundIntentRepository: intents,
      crmConversationRepository: repository,
    };
    const input = {
      idempotencyKey: "preflight-claim-release",
      senderOrigin: "human_crm" as const,
      senderType: "HUMAN" as const,
      cycleId: seeded.conversationCycle.id,
      text: "hello",
    };

    await expect(sendMessage(context(), input, ports)).rejects.toThrow(
      "not active",
    );
    expect(sendText).not.toHaveBeenCalled();
    const [unassigned] = await repository.listConversationCycles({
      limit: 1,
      offset: 0,
      cycleId: seeded.conversationCycle.id,
      storeId,
      tenantId,
    });
    expect(unassigned?.assignedUserId).toBeNull();
    await expect(
      intents.findByIdempotencyKey({
        idempotencyKey: "preflight-claim-release",
        storeId,
        tenantId,
      }),
    ).resolves.toMatchObject({ status: "retryable_failed" });

    await expect(
      connectionRepository.updateConnection({
        connectionId: "connection_1",
        status: "active",
        storeId,
        tenantId,
        expectedRevision: 0,
      }),
    ).resolves.toMatchObject({ status: "active" });
    await expect(sendMessage(context(), input, ports)).resolves.toMatchObject({
      externalId: "provider-after-preflight",
    });
    expect(sendText).toHaveBeenCalledTimes(1);
  });
});
