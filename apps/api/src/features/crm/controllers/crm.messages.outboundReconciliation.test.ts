import { describe, expect, it, vi } from "vitest";
import { createTestCrmConnectionRepository } from "../../../domains/crm/testSupportConnections.js";
import { createTestCrmRoutingPorts } from "../../../domains/crm/testSupportConnections.js";
import { CrmOutboundReconciliationPendingError } from "../../../domains/crm/messaging/crmMessagingErrors.js";
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

describe("CRM outbound reconciliation", () => {
  it("surfaces a pending recovery after delivery when realtime publication fails", async () => {
    const repository = createMemoryCrmConversationRepository();
    const seeded = await repository.ingestMessage({
      customerPhone: "5511999999999",
      channel: "WHATSAPP",
      connectionId: "connection_1",
      content: "inbound",
      direction: "INBOUND",
      externalId: "incoming-realtime-failure",
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
    const sendText = vi.fn(async () => ({
      externalId: "provider-realtime-failure",
      providerTimestamp: new Date("2026-08-10T12:00:00.000Z"),
    }));
    const connectionRepository = createTestCrmConnectionRepository([
      connection(),
    ]);
    const ports = {
      crmAssigneeMembershipRepository: {
        isActiveStoreMember: async () => true,
      },
      crmExternalBotIntegrationRepository:
        createMemoryCrmExternalBotIntegrationRepository(),
      crmConnectionMemberRepository: outboundConnectionMembership(),
      crmConnectionRepository: connectionRepository,
      ...createTestCrmRoutingPorts([connection()]),
      crmRepository: createMemoryCrmRepository(),
      crmMessagingGateway: { sendText } as never,
      crmOutboundIntentRepository: intents,
      crmConversationRepository: repository,
      crmRealtimePublisher: {
        publish: vi.fn().mockRejectedValue(new Error("realtime unavailable")),
      } as never,
    };
    const input = {
      idempotencyKey: "realtime-recovery-key",
      cycleId: seeded.conversationCycle.id,
      text: "hello",
    };

    await expect(sendMessage(context(), input, ports)).rejects.toBeInstanceOf(
      CrmOutboundReconciliationPendingError,
    );
    const recoveredIntent = await intents.findByIdempotencyKey({
      idempotencyKey: "realtime-recovery-key",
      storeId,
      tenantId,
    });
    expect(recoveredIntent?.status).toBe("completed");
    expect(typeof recoveredIntent?.messageId).toBe("string");
    await expect(
      connectionRepository.updateConnection({
        connectionId: "connection_1",
        status: "paused",
        storeId,
        tenantId,
        expectedRevision: 0,
      }),
    ).resolves.toMatchObject({ status: "paused" });
    await expect(sendMessage(context(), input, ports)).resolves.toMatchObject({
      externalId: "provider-realtime-failure",
    });
    expect(sendText).toHaveBeenCalledTimes(1);
  });

  it("keeps a delivery indeterminate when the provider receipt cannot be persisted", async () => {
    const repository = createMemoryCrmConversationRepository();
    const seeded = await repository.ingestMessage({
      customerPhone: "5511999999999",
      channel: "WHATSAPP",
      connectionId: "connection_1",
      content: "inbound",
      direction: "INBOUND",
      externalId: "incoming-receipt-write-failure",
      metadata: {},
      providerTimestamp: new Date(),
      senderOrigin: "customer",
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    const storedIntents = createMemoryCrmOutboundIntentRepository();
    const intents = {
      ...storedIntents,
      recordProviderSuccess: vi.fn(async (input) => {
        await storedIntents.recordProviderSuccess(input);
        throw new Error("intent write unavailable");
      }),
    };
    const sendText = vi.fn(async () => ({
      externalId: "provider-receipt-write-failure",
      providerTimestamp: new Date("2026-08-10T12:00:00.000Z"),
    }));
    const connectionRepository = createTestCrmConnectionRepository([
      connection(),
    ]);
    const ports = {
      crmAssigneeMembershipRepository: {
        isActiveStoreMember: async () => true,
      },
      crmExternalBotIntegrationRepository:
        createMemoryCrmExternalBotIntegrationRepository(),
      crmConnectionMemberRepository: outboundConnectionMembership(),
      crmConnectionRepository: connectionRepository,
      ...createTestCrmRoutingPorts([connection()]),
      crmRepository: createMemoryCrmRepository(),
      crmMessagingGateway: { sendText } as never,
      crmOutboundIntentRepository: intents,
      crmConversationRepository: repository,
    };
    const input = {
      cycleId: seeded.conversationCycle.id,
      idempotencyKey: "receipt-write-failure-key",
      text: "hello",
    };

    await expect(sendMessage(context(), input, ports)).rejects.toBeInstanceOf(
      CrmOutboundReconciliationPendingError,
    );
    await expect(
      storedIntents.findByIdempotencyKey({
        idempotencyKey: "receipt-write-failure-key",
        storeId,
        tenantId,
      }),
    ).resolves.toMatchObject({ status: "provider_succeeded" });
    await expect(sendMessage(context(), input, ports)).resolves.toMatchObject({
      externalId: "provider-receipt-write-failure",
    });
    expect(sendText).toHaveBeenCalledTimes(1);
  });
});
