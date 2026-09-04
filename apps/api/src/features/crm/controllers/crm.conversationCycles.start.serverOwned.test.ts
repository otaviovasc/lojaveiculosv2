import { describe, expect, it, vi } from "vitest";
import { startConversation } from "../../../domains/crm/services/CrmMessagingService/startConversation.js";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmPipelineRepository } from "../adapters/memory/crmPipelineRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmOutboundIntentRepository } from "../adapters/memory/crmOutboundIntentRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createConfiguredZapiTestConnection } from "./crm.channelConnections.testSupport.js";
import { createTestCrmRoutingPorts } from "../../../domains/crm/testSupportConnections.js";

describe("CRM server-owned conversation start", () => {
  it("preserves a foreign assignment for a system-authored start", async () => {
    const repository = createMemoryCrmConversationRepository();
    const seeded = await repository.ingestMessage({
      customerPhone: "5511999999977",
      channel: "WHATSAPP",
      connectionId: "connection-system-start",
      content: "Inbound",
      direction: "INBOUND",
      externalId: "inbound-system-start",
      metadata: {},
      providerTimestamp: new Date("2026-08-18T13:00:00.000Z"),
      senderOrigin: "customer",
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
      type: "TEXT",
    });
    await repository.updateConversationCycle({
      assignedUserId: "other-user" as never,
      cycleId: seeded.conversationCycle.id,
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    });
    const sendText = vi.fn(async () => ({
      externalId: "provider-system-start",
      providerTimestamp: new Date("2026-08-18T13:01:00.000Z"),
      raw: {},
    }));

    await expect(
      startConversation(
        Object.assign(
          createServiceContext({
            actor: { id: "crm-scheduler", kind: "system" },
            permissions: ["crm.messages.send"],
            request: { requestId: "system-start-request" },
            storeId: "store_1",
            tenantId: "tenant_1",
          }),
          { entitlements: ["crm"] as const },
        ),
        {
          connectionId: "connection-system-start",
          phone: "5511999999977",
          senderOrigin: "system",
          senderType: "SYSTEM",
          text: "System outbound",
        },
        {
          crmConnectionRepository: createMemoryCrmConnectionRepository([
            createConfiguredZapiTestConnection({
              id: "connection-system-start",
              storeId: "store_1" as never,
              tenantId: "tenant_1" as never,
            }),
          ]),
          ...createTestCrmRoutingPorts([
            createConfiguredZapiTestConnection({
              id: "connection-system-start",
              storeId: "store_1" as never,
              tenantId: "tenant_1" as never,
            }),
          ]),
          crmPipelineRepository: createMemoryCrmPipelineRepository(),
          crmRepository: createMemoryCrmRepository(),
          crmMessagingGateway: { sendText } as never,
          crmOutboundIntentRepository:
            createMemoryCrmOutboundIntentRepository(),
          crmConversationRepository: repository,
        },
      ),
    ).resolves.toMatchObject({
      message: { externalId: "provider-system-start" },
      conversationCycle: {
        assignedUserId: "other-user",
        id: seeded.conversationCycle.id,
      },
    });
    expect(sendText).toHaveBeenCalledOnce();
  });
});
