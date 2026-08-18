import { describe, expect, it, vi } from "vitest";
import { createTestCrmConnectionRepository } from "../../../domains/crm/testSupportConnections.js";
import { sendWhatsappText } from "../../../domains/crm/services/CrmWhatsapp/sendWhatsappText.js";
import { createMemoryCrmBotIntegrationRepository } from "../adapters/memory/crmBotIntegrationRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmWhatsappOutboundIntentRepository } from "../adapters/memory/crmWhatsappOutboundIntentRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  connection,
  serverContext,
  storeId,
  tenantId,
} from "./crm.whatsapp.outboundIdempotency.testSupport.js";

describe("CRM WhatsApp server-owned outbound messages", () => {
  it.each([
    ["scheduler", "system", "system", "SYSTEM"],
    ["external bot", "integration", "bot_api", "AI"],
  ] as const)(
    "allows a server-owned %s context to send without manager assignment",
    async (_source, actorKind, senderOrigin, senderType) => {
      const repository = createMemoryCrmWhatsappRepository();
      const seeded = await repository.ingestMessage({
        buyerPhone: "5511999999998",
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
      await repository.updateSession({
        assignedUserId: "other-user" as never,
        sessionId: seeded.session.id,
        storeId,
        tenantId,
      });
      const sendText = vi.fn(async () => ({
        externalId: `provider-${actorKind}`,
        providerTimestamp: new Date("2026-08-10T12:00:00.000Z"),
      }));
      const ports = {
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

      await expect(
        sendWhatsappText(
          serverContext(actorKind),
          {
            idempotencyKey: `server-owned-${actorKind}`,
            senderOrigin,
            senderType,
            sessionId: seeded.session.id,
            text: "server-owned",
          },
          ports,
        ),
      ).resolves.toMatchObject({ externalId: `provider-${actorKind}` });
      const [session] = await repository.listSessions({
        limit: 1,
        offset: 0,
        sessionId: seeded.session.id,
        storeId,
        tenantId,
      });
      expect(session?.assignedUserId).toBe("other-user");
      expect(sendText).toHaveBeenCalledOnce();
    },
  );
});
