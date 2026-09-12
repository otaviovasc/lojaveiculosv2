import { Buffer } from "node:buffer";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createConfiguredZapiTestConnection } from "./crm.channelConnections.testSupport.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import {
  createTestCrmAudioNormalizer,
  createTestObjectStorage,
} from "./crm.messages.sendMedia.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";

describe("CRM quick audio message contract", () => {
  it("normalizes once at creation and sends only the OGG/Opus asset", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await conversationRepository.ingestMessage({
      customerPhone: "5511999999999",
      channel: "WHATSAPP",
      connectionId,
      content: "Ola",
      direction: "INBOUND",
      externalId: "inbound-quick-audio",
      metadata: {},
      providerTimestamp: new Date("2026-08-31T18:00:00.000Z"),
      senderOrigin: "customer",
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    const sendMedia = vi.fn(async () => ({
      externalId: "zapi-quick-audio-outbound",
      providerTimestamp: new Date("2026-08-31T18:01:00.000Z"),
    }));
    const { normalizer, normalizeToOggOpus } = createTestCrmAudioNormalizer();
    const app = createTestApp({
      crmAudioNormalizer: normalizer,
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createConfiguredZapiTestConnection({
          id: connectionId,
          storeId,
          tenantId,
        }),
      ]),
      crmConversationRepository: conversationRepository,
      crmMediaStorage: createTestObjectStorage().storage,
      crmMessagingGateway: { sendMedia },
    });

    const created = await app.request("/api/v1/crm/quick-messages", {
      body: JSON.stringify({
        kind: "AUDIO",
        mediaBase64: Buffer.from("quick-audio-webm").toString("base64"),
        mediaFileName: "boas-vindas.webm",
        mediaType: "audio/webm; codecs=opus",
        shortcut: "/boas-vindas",
        title: "Boas-vindas",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const template = (await created.json()) as { id: string };

    const sent = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/messages/quick/${template.id}`,
      {
        body: "{}",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(created.status).toBe(201);
    expect(sent.status).toBe(201);
    expect(normalizeToOggOpus).toHaveBeenCalledOnce();
    expect(sendMedia).toHaveBeenCalledWith(
      expect.objectContaining({ id: connectionId, provider: "zapi" }),
      expect.objectContaining({
        mediaType: "audio",
        mediaUrl: "https://cdn.local/crm-whatsapp/boas-vindas.ogg",
        mimeType: "audio/ogg; codecs=opus",
      }),
    );
  });

  it("requires legacy audio to be replaced before editing its template", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const legacy = await conversationRepository.createQuickMessage({
      content: "",
      createdByUserId: "legacy-user" as never,
      kind: "AUDIO",
      mediaType: "audio/webm",
      mediaUrl: "https://cdn.local/legacy.webm",
      shortcut: "/legacy",
      sortOrder: 1,
      storageKey: "crm/legacy.webm",
      storeId,
      tenantId,
      title: "Legacy",
    });
    const app = createTestApp({
      crmConversationRepository: conversationRepository,
    });

    const response = await app.request(
      `/api/v1/crm/quick-messages/${legacy.id}`,
      {
        body: JSON.stringify({ title: "Updated legacy" }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "CRM_MESSAGING_PROVIDER_ERROR",
    });
    await expect(
      conversationRepository.findQuickMessageById({
        quickMessageId: legacy.id,
        storeId,
        tenantId,
      }),
    ).resolves.toMatchObject({ title: "Legacy" });
  });
});
