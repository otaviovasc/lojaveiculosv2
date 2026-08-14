import { describe, expect, it, vi } from "vitest";
import { ingestOlxChatWebhook } from "../../../domains/crm/services/CrmMessaging/ingestOlxChatWebhook.js";
import { AuthorizationError } from "../../../shared/authorization.js";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  connectionId,
  createOlxConnection,
  olxSecurity,
  storeId,
  tenantId,
  validPayload,
} from "./crm.olxChat.testSupport.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

describe("CRM OLX Chat outbound", () => {
  it("rejects direct OLX ingestion without an issued scoped capability", async () => {
    const context = createServiceContext({
      actor: { id: "olx_chat", kind: "integration" },
      permissions: ["crm.whatsapp.ingest"],
      request: { requestId: "direct-misuse" },
      storeId: null,
      tenantId: null,
    });

    await expect(
      ingestOlxChatWebhook(
        context,
        {
          authorization: {} as never,
          connectionId,
          entitlementGranted: true,
          payload: validPayload(),
        },
        {
          crmProviderRuntime: { olxChatEnabled: true },
          crmRepository: {} as never,
        } as never,
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("sends OLX text idempotently to the chat id and publishes realtime", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const seeded = await whatsappRepository.ingestMessage({
      buyerName: "Ana",
      buyerPhone: "",
      channel: "OLX_CHAT",
      channelExternalId: "olx-chat-1",
      connectionId,
      content: "Olá",
      direction: "INBOUND",
      externalId: "olx-inbound-1",
      metadata: {},
      providerTimestamp: new Date("2026-08-10T12:00:00.000Z"),
      senderOrigin: "customer",
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    const sendText = vi.fn(async () => ({
      externalId: "olx-outbound-1",
      providerTimestamp: new Date("2026-08-10T12:01:00.000Z"),
    }));
    const publish = vi.fn(async () => undefined);
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        {
          ...createOlxConnection(),
          metadata: {
            webhookSetup: {
              capabilities: { chat: { status: "active" } },
            },
          },
        },
      ]),
      crmRealtimePublisher: { publish },
      crmWhatsappGateway: { sendText },
      crmWhatsappRepository: whatsappRepository,
      entitlements: ["crm"],
      crmOlxWebhookSecurity: olxSecurity(),
      olxChatEnabled: true,
    });
    const request = () =>
      app.request("/api/v1/crm/whatsapp/send/text", {
        body: JSON.stringify({
          sessionId: seeded.session.id,
          text: "Resposta",
        }),
        headers: {
          "content-type": "application/json",
          "idempotency-key": "olx-send-1",
        },
        method: "POST",
      });

    const first = await request();
    const duplicate = await request();

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(201);
    expect(sendText).toHaveBeenCalledTimes(1);
    expect(sendText).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "olx_chat" }),
      { phone: "olx-chat-1", text: "Resposta" },
    );
    expect(await first.json()).toMatchObject({ externalId: "olx-outbound-1" });
    expect(await duplicate.json()).toMatchObject({
      externalId: "olx-outbound-1",
    });
    expect(publish).toHaveBeenCalledTimes(2);
  });

  it("fails closed for imported OLX sessions while the runtime switch is off", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const seeded = await whatsappRepository.ingestMessage({
      buyerName: "Ana",
      buyerPhone: "",
      channel: "OLX_CHAT",
      channelExternalId: "olx-chat-disabled",
      connectionId,
      content: "Olá",
      direction: "INBOUND",
      externalId: "olx-inbound-disabled",
      metadata: {},
      providerTimestamp: new Date("2026-08-10T12:00:00.000Z"),
      senderOrigin: "customer",
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    const sendText = vi.fn();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createOlxConnection(),
      ]),
      crmWhatsappGateway: { sendText },
      crmWhatsappRepository: whatsappRepository,
      entitlements: ["crm"],
    });

    const response = await app.request("/api/v1/crm/whatsapp/send/text", {
      body: JSON.stringify({ sessionId: seeded.session.id, text: "Resposta" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(409);
    expect(sendText).not.toHaveBeenCalled();
  });
});
