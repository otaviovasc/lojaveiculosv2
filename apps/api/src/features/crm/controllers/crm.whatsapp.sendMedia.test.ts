import { Buffer } from "node:buffer";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type {
  ObjectStorage,
  PutStorageObjectInput,
} from "../../../shared/storage/objectStorage.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  createAuditSpy,
  createTestApp,
} from "./crm.whatsapp.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";

describe("CRM WhatsApp send media", () => {
  it("uploads, sends through ZAPI, and stores outbound image media", async () => {
    const { audit, record } = createAuditSpy();
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const inbound = await seedSession(whatsappRepository, "image");
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
      crmWhatsappGateway: {
        getConnectionStatus: vi.fn(),
        sendMedia,
        sendText: vi.fn(),
      },
      crmWhatsappMediaStorage: storage,
      crmWhatsappRepository: whatsappRepository,
    });

    const response = await app.request("/api/v1/crm/whatsapp/send/media", {
      body: JSON.stringify({
        base64: Buffer.from("image-bytes").toString("base64"),
        caption: "Foto do Civic",
        fileName: "civic.jpg",
        mediaType: "image",
        mimeType: "image/jpeg",
        sessionId: inbound.session.id,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
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
          inbound.session.id,
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
    expect(record.mock.calls.map((call) => call[0].outcome)).toEqual([
      "attempted",
      "succeeded",
    ]);
  });

  it("sends video media with async ZAPI processing metadata", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const inbound = await seedSession(whatsappRepository, "video");
    const sendMedia = vi.fn(async () => ({
      externalId: "zapi-video-outbound-1",
      providerTimestamp: new Date("2026-07-02T19:02:00.000Z"),
      raw: { messageId: "zapi-video-outbound-1" },
    }));
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappGateway: {
        getConnectionStatus: vi.fn(),
        sendMedia,
        sendText: vi.fn(),
      },
      crmWhatsappMediaStorage: createTestObjectStorage().storage,
      crmWhatsappRepository: whatsappRepository,
    });

    const response = await app.request("/api/v1/crm/whatsapp/send/media", {
      body: JSON.stringify({
        base64: Buffer.from("video-bytes").toString("base64"),
        caption: "Video do Civic",
        fileName: "civic.mp4",
        mediaType: "video",
        mimeType: "video/mp4",
        sessionId: inbound.session.id,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

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
});

function seedSession(
  whatsappRepository: ReturnType<typeof createMemoryCrmWhatsappRepository>,
  suffix: string,
) {
  return whatsappRepository.ingestMessage({
    buyerName: "Ana",
    buyerPhone: "5511999999999",
    channel: "WHATSAPP",
    connectionId,
    content: "Ola",
    direction: "INBOUND",
    externalId: `inbound-media-send-${suffix}`,
    metadata: {},
    providerTimestamp: new Date("2026-07-02T19:00:00.000Z"),
    senderType: "CUSTOMER",
    status: "DELIVERED",
    storeId,
    tenantId,
    type: "TEXT",
  });
}

function createZapiConnection(
  overrides: Partial<CrmConnection> = {},
): CrmConnection {
  return {
    credentialsRef: {},
    displayName: "ZAPI Test Connection",
    externalConnectionId: null,
    externalInstanceId: null,
    id: connectionId,
    metadata: {},
    phone: null,
    provider: "zapi",
    status: "sandbox",
    storeId,
    tenantId,
    webhookUrl: null,
    ...overrides,
  };
}

function createTestObjectStorage(): {
  putObject: ReturnType<
    typeof vi.fn<
      (input: PutStorageObjectInput) => Promise<{
        publicUrl: string;
        storageKey: string;
      }>
    >
  >;
  storage: ObjectStorage;
} {
  const putObject = vi.fn(async (input: PutStorageObjectInput) => ({
    publicUrl: `https://cdn.local/crm-whatsapp/${input.fileName}`,
    storageKey: `crm-whatsapp/${input.fileName}`,
  }));
  return {
    putObject,
    storage: {
      createDownload: vi.fn(),
      createUpload: vi.fn(),
      getPublicUrl: (storageKey) => `https://cdn.local/${storageKey}`,
      putObject,
    },
  };
}
