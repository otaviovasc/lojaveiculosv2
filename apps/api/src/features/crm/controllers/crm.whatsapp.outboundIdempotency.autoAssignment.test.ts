import { describe, expect, it, vi } from "vitest";
import { sendWhatsappText } from "../../../domains/crm/services/CrmWhatsapp/sendWhatsappText.js";
import { createTestCrmConnectionRepository } from "../../../domains/crm/testSupportConnections.js";
import { createMemoryCrmBotIntegrationRepository } from "../adapters/memory/crmBotIntegrationRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmWhatsappOutboundIntentRepository } from "../adapters/memory/crmWhatsappOutboundIntentRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  connection,
  context,
  storeId,
  tenantId,
} from "./crm.whatsapp.outboundIdempotency.testSupport.js";

describe("CRM WhatsApp outbound idempotency auto-assignment", () => {
  it("keeps automatic self-assignment idempotent with a completed outbound intent", async () => {
    const repository = createMemoryCrmWhatsappRepository();
    const seeded = await repository.ingestMessage({
      buyerPhone: "5511999999999",
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
      crmBotIntegrationRepository: createMemoryCrmBotIntegrationRepository(),
      crmConnectionRepository: createTestCrmConnectionRepository([
        connection(),
      ]),
      crmRepository: createMemoryCrmRepository(),
      crmWhatsappGateway: { sendText } as never,
      crmWhatsappOutboundIntentRepository:
        createMemoryCrmWhatsappOutboundIntentRepository(),
      crmWhatsappRepository: repository,
    };
    const input = {
      idempotencyKey: "human-auto-assignment",
      senderOrigin: "human_crm" as const,
      senderType: "HUMAN" as const,
      sessionId: seeded.session.id,
      text: "hello",
    };

    await sendWhatsappText(context(), input, ports);
    await sendWhatsappText(context(), input, ports);

    const [session] = await repository.listSessions({
      limit: 1,
      offset: 0,
      sessionId: seeded.session.id,
      storeId,
      tenantId,
    });
    expect(session?.assignedUserId).toBe("user_1");
    expect(sendText).toHaveBeenCalledTimes(1);
  });
});
