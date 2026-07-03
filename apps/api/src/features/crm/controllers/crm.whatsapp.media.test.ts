import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type {
  ObjectStorage,
  PutStorageObjectInput,
} from "../../../shared/storage/objectStorage.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";

describe("CRM WhatsApp media webhooks", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores inbound ZAPI image media as a CRM WhatsApp message", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
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
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(new Uint8Array([1, 2, 3]), {
            headers: { "Content-Type": "image/png" },
            status: 200,
          }),
      ),
    );
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
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
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not found", { status: 404 })),
    );
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
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
});

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

function postImageWebhook(
  app: ReturnType<typeof createTestApp>,
  input: { imageUrl: string; messageId: string },
) {
  return app.request(
    `/api/v1/crm/whatsapp/webhooks/zapi/${connectionId}/received`,
    {
      body: JSON.stringify({
        image: {
          caption: "Foto do carro",
          imageUrl: input.imageUrl,
          mimeType: "image/jpeg",
        },
        messageId: input.messageId,
        phone: "5511999999999",
        senderName: "Ana",
        timestamp: 1783029600,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
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
