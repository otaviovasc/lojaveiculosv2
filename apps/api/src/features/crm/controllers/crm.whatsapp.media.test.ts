import { describe, expect, it, vi } from "vitest";
import { UnsafeCrmRemoteMediaUrlError } from "../../../domains/crm/ports/crmRemoteMediaFetcher.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";
import {
  createRemoteMediaFetcher,
  createTestObjectStorage,
  createZapiMediaTestConnection,
  mediaTestConnectionId as connectionId,
  mediaTestStoreId as storeId,
  mediaTestTenantId as tenantId,
  postImageWebhook,
} from "./crm.whatsapp.media.testSupport.js";

describe("CRM WhatsApp media webhooks", () => {
  it("stores inbound ZAPI image media as a CRM WhatsApp message", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiMediaTestConnection(),
      ]),
      crmWhatsappMediaFetcher: createRemoteMediaFetcher(),
      crmWhatsappRepository: whatsappRepository,
    });

    const response = await postImageWebhook(app, {
      imageUrl: "https://zapi.test/media/car.jpg",
      messageId: "zapi-image-1",
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      message: {
        content: string;
        mediaType: string | null;
        mediaUrl: string | null;
        metadata: Record<string, unknown>;
        type: string;
      };
      session: { id: string; lastMessageContent: string | null };
      status: string;
    };

    expect(body).toMatchObject({
      message: {
        content: "Foto do carro",
        mediaType: "image",
        mediaUrl: "https://zapi.test/media/car.jpg",
        type: "IMAGE",
      },
      session: {
        lastMessageContent: "Foto do carro",
      },
      status: "stored",
    });
    expect(body.message.metadata).toMatchObject({
      media: {
        caption: "Foto do carro",
        mimeType: "image/jpeg",
      },
      provider: "zapi",
    });

    const messages = await whatsappRepository.listMessages({
      limit: 10,
      offset: 0,
      sessionId: body.session.id,
      storeId,
      tenantId,
    });
    expect(messages[0]).toMatchObject({
      mediaUrl: "https://zapi.test/media/car.jpg",
      type: "IMAGE",
    });
  });

  it("mirrors inbound ZAPI media to configured object storage", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const { putObject, storage } = createTestObjectStorage();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiMediaTestConnection(),
      ]),
      crmWhatsappMediaFetcher: createRemoteMediaFetcher({
        body: new Uint8Array([1, 2, 3]),
        contentType: "image/png",
        finalUrl: "https://zapi.test/media/car.jpg",
      }),
      crmWhatsappMediaStorage: storage,
      crmWhatsappRepository: whatsappRepository,
    });

    const response = await postImageWebhook(app, {
      imageUrl: "https://zapi.test/media/car.jpg",
      messageId: "zapi-image-r2-1",
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      message: {
        mediaUrl: string | null;
        metadata: { media?: Record<string, unknown> };
      };
    };
    expect(body.message.mediaUrl).toBe(
      "https://cdn.local/crm-whatsapp/car.jpg",
    );
    expect(body.message.metadata.media).toMatchObject({
      contentType: "image/png",
      mirrorStatus: "stored",
      providerUrl: "https://zapi.test/media/car.jpg",
      sizeBytes: 3,
      storageKey: "crm-whatsapp/car.jpg",
    });

    const putInput = putObject.mock.calls[0]?.[0];
    expect(putInput).toBeDefined();
    expect(putInput?.contentType).toBe("image/png");
    expect(putInput?.fileName).toBe("car.jpg");
    expect(putInput?.scopeSegments).toEqual([
      "crm",
      "whatsapp",
      tenantId,
      storeId,
      connectionId,
      "zapi-image-r2-1",
    ]);
  });

  it("keeps the ZAPI media URL when object storage mirroring fails", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiMediaTestConnection(),
      ]),
      crmWhatsappMediaFetcher: {
        fetchMedia: vi.fn(async () => {
          throw new Error("not found");
        }),
        validateUrl: vi.fn(async () => undefined),
      },
      crmWhatsappMediaStorage: createTestObjectStorage().storage,
      crmWhatsappRepository: whatsappRepository,
    });

    const response = await postImageWebhook(app, {
      imageUrl: "https://zapi.test/media/failing.jpg",
      messageId: "zapi-image-fallback-1",
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      message: {
        mediaUrl: string | null;
        metadata: { media?: Record<string, unknown> };
      };
    };
    expect(body.message.mediaUrl).toBe("https://zapi.test/media/failing.jpg");
    expect(body.message.metadata.media).toMatchObject({
      mirrorErrorName: "Error",
      mirrorStatus: "failed",
      providerUrl: "https://zapi.test/media/failing.jpg",
    });
  });

  it("does not persist a displayable URL rejected by the safety policy", async () => {
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiMediaTestConnection(),
      ]),
      crmWhatsappMediaFetcher: {
        fetchMedia: vi.fn(async () => {
          throw new UnsafeCrmRemoteMediaUrlError();
        }),
        validateUrl: vi.fn(async () => {
          throw new UnsafeCrmRemoteMediaUrlError();
        }),
      },
      crmWhatsappMediaStorage: createTestObjectStorage().storage,
    });

    const response = await postImageWebhook(app, {
      imageUrl: "https://127.0.0.1/internal.jpg",
      messageId: "zapi-image-unsafe-1",
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      message: {
        mediaUrl: string | null;
        metadata: { media?: Record<string, unknown> };
      };
    };
    expect(body.message.mediaUrl).toBeNull();
    expect(body.message.metadata.media).toMatchObject({
      mirrorErrorName: "UnsafeCrmRemoteMediaUrlError",
      mirrorStatus: "failed",
      unsafeUrlRejected: true,
    });
    expect(body.message.metadata.media).not.toHaveProperty("providerUrl");
  });
});
