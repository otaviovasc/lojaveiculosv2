import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmBotIntegrationRepository } from "../adapters/memory/crmBotIntegrationRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmWhatsappOutboundIntentRepository } from "../adapters/memory/crmWhatsappOutboundIntentRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createTestCrmConnectionRepository } from "../../../domains/crm/testSupportConnections.js";
import { sendWhatsappText } from "../../../domains/crm/services/CrmWhatsapp/sendWhatsappText.js";
import { CrmWhatsappGatewayError } from "../../../domains/crm/ports/crmWhatsappGateway.js";
import {
  connection,
  context,
  storeId,
  tenantId,
} from "./crm.whatsapp.outboundIdempotency.testSupport.js";

describe("sendWhatsappOutboundMessage failure classification", () => {
  it("does not re-send a deterministic provider rejection", async () => {
    const repository = createMemoryCrmWhatsappRepository();
    const seeded = await repository.ingestMessage({
      buyerPhone: "5511999999999",
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
      throw new CrmWhatsappGatewayError(
        "Provider rejected the message",
        502,
        undefined,
        "provider_rejected",
      );
    });
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
    const input = {
      idempotencyKey: "terminal-provider-rejection",
      sessionId: seeded.session.id,
      text: "hello",
    };

    await expect(
      sendWhatsappText(context(), input, ports),
    ).rejects.toMatchObject({ code: "provider_rejected" });
    await expect(
      sendWhatsappText(context(), input, ports),
    ).rejects.toMatchObject({ code: "provider_rejected" });
    expect(sendText).toHaveBeenCalledTimes(1);
  });
});
