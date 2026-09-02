import { Buffer } from "node:buffer";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createAuditSpy, createTestApp } from "./crm.controller.testSupport.js";
import {
  createMediaTestZapiConnection as createZapiConnection,
  createTestObjectStorage,
  mediaTestConnectionId as connectionId,
  mediaTestStoreId as storeId,
  mediaTestTenantId as tenantId,
  seedMediaConversationCycle as seedCycle,
} from "./crm.messages.sendMedia.testSupport.js";

describe("CRM conversation media messages", () => {
  it("uploads, sends through ZAPI, and stores outbound image media", async () => {
    const { audit, record } = createAuditSpy();
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await seedCycle(conversationRepository, "image");
    const { putObject, storage } = createTestObjectStorage();
    const sendMedia = vi.fn(async () => ({
      externalId: "zapi-image-outbound-1",
      providerTimestamp: new Date("2026-07-02T19:01:00.000Z"),
      raw: { messageId: "zapi-image-outbound-1" },
    }));
    const app = createTestApp({
      audit,
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmMessagingGateway: {
        getConnectionStatus: vi.fn(),
        sendMedia,
        sendText: vi.fn(),
      },
      crmMediaStorage: storage,
      crmConversationRepository: conversationRepository,
    });

    const mediaUrl = `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/messages/media`;
    const response = await app.request(mediaUrl, {
      body: JSON.stringify({
        base64: Buffer.from("image-bytes").toString("base64"),
        caption: "Foto do Civic",
        fileName: "civic.jpg",
        mediaType: "image",
        mimeType: "image/jpeg",
      }),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "media-upload-1",
      },
      method: "POST",
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      clientRequestId: "media-upload-1",
      content: "Foto do Civic",
      direction: "OUTBOUND",
      externalId: "zapi-image-outbound-1",
      mediaType: "image",
      mediaUrl: "https://cdn.local/crm-whatsapp/civic.jpg",
      status: "SENT",
      type: "IMAGE",
    });
    expect(putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: "image/jpeg",
        fileName: "civic.jpg",
        scopeSegments: [
          "crm",
          "whatsapp",
          tenantId,
          storeId,
          connectionId,
          inbound.conversationCycle.id,
          "outbound",
        ],
      }),
    );
    expect(sendMedia).toHaveBeenCalledWith(
      expect.objectContaining({ id: connectionId, provider: "zapi" }),
      {
        caption: "Foto do Civic",
        fileName: "civic.jpg",
        mediaType: "image",
        mediaUrl: "https://cdn.local/crm-whatsapp/civic.jpg",
        mimeType: "image/jpeg",
        phone: "5511999999999",
      },
    );
    const conflicting = await app.request(mediaUrl, {
      body: JSON.stringify({
        base64: Buffer.from("different-image-bytes").toString("base64"),
        caption: "Foto do Civic",
        fileName: "civic.jpg",
        mediaType: "image",
        mimeType: "image/jpeg",
      }),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "media-upload-1",
      },
      method: "POST",
    });
    expect(conflicting.status).toBe(409);
    expect(sendMedia).toHaveBeenCalledTimes(1);
    expect(
      record.mock.calls
        .map((call) => call[0])
        .filter(
          (event) => event.action === "crm.conversation_cycle.auto_assign",
        ),
    ).toMatchObject([
      { metadata: { result: "attempted" }, outcome: "attempted" },
      { metadata: { result: "applied" }, outcome: "succeeded" },
    ]);
    expect(record.mock.calls.map((call) => call[0].outcome)).toEqual([
      "attempted",
      "attempted",
      "succeeded",
      "succeeded",
      "attempted",
      "failed",
    ]);
  });

  it("sends video media with async ZAPI processing metadata", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await seedCycle(conversationRepository, "video");
    const sendMedia = vi.fn(async () => ({
      externalId: "zapi-video-outbound-1",
      providerTimestamp: new Date("2026-07-02T19:02:00.000Z"),
      raw: { messageId: "zapi-video-outbound-1" },
    }));
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmMessagingGateway: {
        getConnectionStatus: vi.fn(),
        sendMedia,
        sendText: vi.fn(),
      },
      crmMediaStorage: createTestObjectStorage().storage,
      crmConversationRepository: conversationRepository,
    });

    const response = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/messages/media`,
      {
        body: JSON.stringify({
          base64: Buffer.from("video-bytes").toString("base64"),
          caption: "Video do Civic",
          fileName: "civic.mp4",
          mediaType: "video",
          mimeType: "video/mp4",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      content: "Video do Civic",
      mediaType: "video",
      status: "SENT",
      type: "VIDEO",
      metadata: {
        media: {
          asyncProcessing: true,
          videoProcessingStage: "SUBMITTED",
        },
      },
    });
    expect(sendMedia).toHaveBeenCalledWith(
      expect.objectContaining({ id: connectionId, provider: "zapi" }),
      expect.objectContaining({
        asyncProcessing: true,
        mediaType: "video",
        mediaUrl: "https://cdn.local/crm-whatsapp/civic.mp4",
        phone: "5511999999999",
      }),
    );
  });

  it("does not expose the legacy WhatsApp media alias", async () => {
    const app = createTestApp();

    const response = await app.request("/api/v1/crm/whatsapp/send/media", {
      method: "POST",
    });

    expect(response.status).toBe(404);
  });
});
