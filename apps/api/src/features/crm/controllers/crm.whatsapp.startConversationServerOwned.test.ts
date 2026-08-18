import { describe, expect, it, vi } from "vitest";
import { startWhatsappConversation } from "../../../domains/crm/services/CrmWhatsapp/startWhatsappConversation.js";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmPipelineRepository } from "../adapters/memory/crmPipelineRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmWhatsappOutboundIntentRepository } from "../adapters/memory/crmWhatsappOutboundIntentRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createConfiguredZapiTestConnection } from "./crm.whatsapp.connectionFixtures.js";

describe("CRM WhatsApp server-owned conversation start", () => {
  it("preserves a foreign assignment for a system-authored start", async () => {
    const repository = createMemoryCrmWhatsappRepository();
    const seeded = await repository.ingestMessage({
      buyerPhone: "5511999999977",
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
    await repository.updateSession({
      assignedUserId: "other-user" as never,
      sessionId: seeded.session.id,
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    });
    const sendText = vi.fn(async () => ({
      externalId: "provider-system-start",
      providerTimestamp: new Date("2026-08-18T13:01:00.000Z"),
      raw: {},
    }));

    await expect(
      startWhatsappConversation(
        Object.assign(
          createServiceContext({
            actor: { id: "crm-scheduler", kind: "system" },
            permissions: ["crm.whatsapp.send"],
            request: { requestId: "system-start-request" },
            storeId: "store_1",
            tenantId: "tenant_1",
          }),
          { entitlements: ["crm", "crm_zapi"] as const },
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
          crmPipelineRepository: createMemoryCrmPipelineRepository(),
          crmRepository: createMemoryCrmRepository(),
          crmWhatsappGateway: { sendText } as never,
          crmWhatsappOutboundIntentRepository:
            createMemoryCrmWhatsappOutboundIntentRepository(),
          crmWhatsappRepository: repository,
        },
      ),
    ).resolves.toMatchObject({
      message: { externalId: "provider-system-start" },
      session: { assignedUserId: "other-user", id: seeded.session.id },
    });
    expect(sendText).toHaveBeenCalledOnce();
  });
});
