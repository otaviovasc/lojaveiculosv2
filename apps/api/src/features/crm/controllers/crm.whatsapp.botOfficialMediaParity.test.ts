import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmWhatsappSendMediaInput } from "../../../domains/crm/ports/crmWhatsappGateway.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  configureBot,
  jsonRequest,
} from "./crm.whatsapp.botForwarding.testSupport.js";
import {
  createTestApp,
  expectApiError,
} from "./crm.whatsapp.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("CRM official bot media parity", () => {
  it("blocks media when there is no customer conversation", async () => {
    const sendMedia = vi.fn();
    const connection = createOfficialConnection(
      "composio_whatsapp",
      "25000000-0000-4000-8000-000000000401",
    );
    const app = createApp(connection, { crmWhatsappGateway: { sendMedia } });
    await configureBot(app);

    const response = await app.request(
      "/api/v1/crm/whatsapp/integrations/bot/actions",
      jsonRequest(
        {
          action: "send_image",
          connectionId: connection.id,
          payload: {
            imageUrl: "https://cdn.example.test/vehicle.jpg",
            phone: "5511999999999",
          },
        },
        { "X-Webhook-Secret": "bot-secret-value" },
      ),
    );

    expect(response.status).toBe(409);
    await expectApiError(response, {
      code: "CRM_WHATSAPP_BOT_ACTION_BLOCKED",
      message:
        "Official channel media requires an existing customer conversation.",
    });
    expect(sendMedia).not.toHaveBeenCalled();
  });

  it("persists Instagram bot media on the Instagram channel", async () => {
    const connection = createOfficialConnection(
      "composio_instagram",
      "25000000-0000-4000-8000-000000000402",
    );
    const repository = createMemoryCrmWhatsappRepository();
    const inbound = await repository.ingestMessage({
      buyerPhone: "",
      channel: "INSTAGRAM",
      channelExternalId: "ig-customer-1",
      connectionId: connection.id,
      content: "Quero ver o carro",
      direction: "INBOUND",
      externalId: "ig-inbound-1",
      metadata: {},
      providerTimestamp: new Date(),
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    const sendMedia = createSendMediaSpy("instagram-image");
    const app = createApp(connection, {
      crmWhatsappGateway: { sendMedia },
      crmWhatsappRepository: repository,
    });
    await configureBot(app);

    const response = await app.request(
      "/api/v1/crm/whatsapp/integrations/bot/actions",
      jsonRequest(
        {
          action: "send_image",
          payload: { imageUrl: "https://cdn.example.test/vehicle.jpg" },
          sessionId: inbound.session.id,
        },
        { "X-Webhook-Secret": "bot-secret-value" },
      ),
    );

    expect(response.status).toBe(200);
    expect(sendMedia).toHaveBeenCalledWith(
      connection,
      expect.objectContaining({ phone: "ig-customer-1" }),
    );
    await expect(
      repository.findMessageByExternalId({
        connectionId: connection.id,
        externalId: "instagram-image-external",
        storeId,
        tenantId,
      }),
    ).resolves.toMatchObject({ channel: "INSTAGRAM" });
  });
});

function createApp(
  connection: CrmConnection,
  options: Parameters<typeof createTestApp>[0],
) {
  return createTestApp({
    crmConnectionRepository: createMemoryCrmConnectionRepository([connection]),
    ...options,
  });
}

function createSendMediaSpy(action: string) {
  return vi.fn(
    async (_connection: CrmConnection, _input: CrmWhatsappSendMediaInput) => ({
      externalId: `${action}-external`,
      providerTimestamp: new Date("2026-07-02T19:02:00.000Z"),
      raw: { messageId: `${action}-external` },
    }),
  );
}

function createOfficialConnection(
  provider: "composio_instagram" | "composio_whatsapp",
  id: string,
): CrmConnection {
  return {
    credentialsRef: {},
    displayName: provider,
    externalConnectionId: `${id}-sender`,
    externalInstanceId: null,
    id,
    metadata: {},
    phone: provider === "composio_whatsapp" ? "5511999999999" : null,
    provider,
    status: "sandbox",
    storeId,
    tenantId,
    webhookUrl: null,
  };
}
