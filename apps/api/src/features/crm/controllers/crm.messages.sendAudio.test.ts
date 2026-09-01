import { Buffer } from "node:buffer";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { CrmAudioNormalizationError } from "../../../domains/crm/ports/crmAudioNormalizer.js";
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

describe("human CRM audio messages", () => {
  it("stores the recording durably before provider delivery", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await conversationRepository.ingestMessage({
      customerDisplayName: "Ana",
      customerPhone: "5511999999999",
      channel: "WHATSAPP",
      connectionId,
      content: "Ola",
      direction: "INBOUND",
      externalId: "inbound-audio-send",
      metadata: {},
      providerTimestamp: new Date("2026-07-02T19:00:00.000Z"),
      senderOrigin: "customer",
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    const { putObject, storage } = createTestObjectStorage();
    const { normalizer, normalizeToOggOpus } = createTestCrmAudioNormalizer();
    const sendMedia = vi.fn(async () => ({
      externalId: "zapi-audio-outbound-1",
      providerTimestamp: new Date("2026-07-02T19:01:00.000Z"),
      raw: { messageId: "zapi-audio-outbound-1" },
    }));
    const connection = createConfiguredZapiTestConnection({
      id: connectionId,
      storeId,
      tenantId,
    });
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        connection,
      ]),
      crmAudioNormalizer: normalizer,
      crmConversationRepository: conversationRepository,
      crmMediaStorage: storage,
      crmMessagingGateway: {
        getConnectionStatus: vi.fn(),
        sendMedia,
        sendText: vi.fn(),
      },
    });

    const response = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/messages/media`,
      {
        body: JSON.stringify({
          base64: Buffer.from("recorded-audio").toString("base64"),
          fileName: "gravacao.webm",
          mediaType: "audio",
          mimeType: "audio/webm",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      direction: "OUTBOUND",
      mediaType: "audio",
      mediaUrl: "https://cdn.local/crm-whatsapp/gravacao.ogg",
      senderOrigin: "human_crm",
      status: "SENT",
      type: "AUDIO",
    });
    expect(putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: "audio/ogg; codecs=opus",
        fileName: "gravacao.ogg",
      }),
    );
    expect(normalizeToOggOpus).toHaveBeenCalledWith({
      body: new Uint8Array(Buffer.from("recorded-audio")),
      sourceMimeType: "audio/webm",
    });
    expect(sendMedia).toHaveBeenCalledWith(
      expect.objectContaining({ id: connectionId, provider: "zapi" }),
      expect.objectContaining({
        mediaType: "audio",
        mediaUrl: "https://cdn.local/crm-whatsapp/gravacao.ogg",
        mimeType: "audio/ogg; codecs=opus",
      }),
    );
  });

  it("does not report provider success when audio normalization fails", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await conversationRepository.ingestMessage({
      customerPhone: "5511999999999",
      channel: "WHATSAPP",
      connectionId,
      content: "Ola",
      direction: "INBOUND",
      externalId: "inbound-invalid-audio-send",
      metadata: {},
      providerTimestamp: new Date("2026-07-02T19:00:00.000Z"),
      senderOrigin: "customer",
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    const { putObject, storage } = createTestObjectStorage();
    const sendMedia = vi.fn();
    const app = createTestApp({
      crmAudioNormalizer: {
        normalizeToOggOpus: vi.fn(async () => {
          throw new CrmAudioNormalizationError("invalid_media");
        }),
      },
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createConfiguredZapiTestConnection({
          id: connectionId,
          storeId,
          tenantId,
        }),
      ]),
      crmConversationRepository: conversationRepository,
      crmMediaStorage: storage,
      crmMessagingGateway: { sendMedia },
    });

    const response = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/messages/media`,
      {
        body: JSON.stringify({
          base64: Buffer.from("invalid-audio").toString("base64"),
          fileName: "gravacao.webm",
          mediaType: "audio",
          mimeType: "audio/webm",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "CRM_MESSAGING_PROVIDER_ERROR",
    });
    expect(putObject).not.toHaveBeenCalled();
    expect(sendMedia).not.toHaveBeenCalled();
  });

  it("reports an unavailable audio runtime as a deterministic configuration error", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await conversationRepository.ingestMessage({
      customerPhone: "5511999999999",
      channel: "WHATSAPP",
      connectionId,
      content: "Ola",
      direction: "INBOUND",
      externalId: "inbound-unavailable-audio-runtime",
      metadata: {},
      providerTimestamp: new Date("2026-07-02T19:00:00.000Z"),
      senderOrigin: "customer",
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    const sendMedia = vi.fn();
    const app = createTestApp({
      crmAudioNormalizer: {
        normalizeToOggOpus: vi.fn(async () => {
          throw new CrmAudioNormalizationError("runtime_unavailable");
        }),
      },
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

    const response = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/messages/media`,
      {
        body: JSON.stringify({
          base64: Buffer.from("recorded-audio").toString("base64"),
          fileName: "gravacao.webm",
          mediaType: "audio",
          mimeType: "audio/webm",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      code: "CRM_MESSAGING_CONFIGURATION_ERROR",
      retryable: false,
    });
    expect(sendMedia).not.toHaveBeenCalled();
  });
});
