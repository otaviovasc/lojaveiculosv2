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
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";

describe("CRM WhatsApp quick messages", () => {
  it("starts without system default templates", async () => {
    const response = await createTestApp().request(
      "/api/v1/crm/whatsapp/quick-messages",
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
  });

  it("creates text and audio dealership templates", async () => {
    const app = createTestApp({
      crmWhatsappMediaStorage: createTestObjectStorage().storage,
    });

    const text = await postJson(app, "/api/v1/crm/whatsapp/quick-messages", {
      content: "Segue nossa chave Pix.",
      shortcut: "/pix",
      title: "Chave Pix",
    });
    expect(text.status).toBe(201);
    await expect(text.json()).resolves.toMatchObject({
      content: "Segue nossa chave Pix.",
      kind: "TEXT",
      shortcut: "/pix",
      title: "Chave Pix",
    });

    const audio = await postJson(app, "/api/v1/crm/whatsapp/quick-messages", {
      kind: "AUDIO",
      mediaBase64: Buffer.from("audio-bytes").toString("base64"),
      mediaFileName: "boas-vindas.ogg",
      mediaType: "audio/ogg",
      shortcut: "/audio",
      title: "Audio de boas-vindas",
    });
    expect(audio.status).toBe(201);
    await expect(audio.json()).resolves.toMatchObject({
      kind: "AUDIO",
      mediaType: "audio/ogg",
      mediaUrl: "https://cdn.local/boas-vindas.ogg",
      shortcut: "/audio",
    });
  });

  it("sends an image template through the outbound media flow", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const inbound = await seedSession(whatsappRepository);
    const sendMedia = vi.fn(async () => ({
      externalId: "zapi-quick-image-outbound",
      providerTimestamp: new Date("2026-07-02T21:00:00.000Z"),
      raw: { messageId: "zapi-quick-image-outbound" },
    }));
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappGateway: {
        sendMedia,
      },
      crmWhatsappMediaStorage: createTestObjectStorage().storage,
      crmWhatsappRepository: whatsappRepository,
    });

    const created = await postJson(app, "/api/v1/crm/whatsapp/quick-messages", {
      content: "Foto do painel.",
      kind: "IMAGE",
      mediaBase64: Buffer.from("image-bytes").toString("base64"),
      mediaFileName: "painel.jpg",
      mediaType: "image/jpeg",
      shortcut: "/painel",
      title: "Foto do painel",
    });
    const template = (await created.json()) as { id: string };
    const sent = await postJson(
      app,
      `/api/v1/crm/whatsapp/quick-messages/${template.id}/send`,
      { sessionId: inbound.session.id },
    );

    expect(sent.status).toBe(201);
    await expect(sent.json()).resolves.toMatchObject({
      content: "Foto do painel.",
      direction: "OUTBOUND",
      externalId: "zapi-quick-image-outbound",
      mediaUrl: "https://cdn.local/painel.jpg",
      type: "IMAGE",
    });
    expect(sendMedia).toHaveBeenCalledWith(
      expect.objectContaining({ id: connectionId, provider: "zapi" }),
      {
        caption: "Foto do painel.",
        mediaType: "image",
        mediaUrl: "https://cdn.local/painel.jpg",
        phone: "5511999999999",
      },
    );
  });
});

function postJson(
  app: ReturnType<typeof createTestApp>,
  path: string,
  body: unknown,
) {
  return app.request(path, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

function seedSession(
  whatsappRepository: ReturnType<typeof createMemoryCrmWhatsappRepository>,
) {
  return whatsappRepository.ingestMessage({
    buyerName: "Ana",
    buyerPhone: "5511999999999",
    channel: "WHATSAPP",
    connectionId,
    content: "Ola",
    direction: "INBOUND",
    externalId: "inbound-quick-message-send",
    metadata: {},
    providerTimestamp: new Date("2026-07-02T20:00:00.000Z"),
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

function createTestObjectStorage(): { storage: ObjectStorage } {
  const putObject = vi.fn(async (input: PutStorageObjectInput) => ({
    publicUrl: `https://cdn.local/${input.fileName}`,
    storageKey: `crm-whatsapp/${input.fileName}`,
  }));
  return {
    storage: {
      createDownload: vi.fn(),
      createUpload: vi.fn(),
      getPublicUrl: (storageKey) => `https://cdn.local/${storageKey}`,
      putObject,
    },
  };
}
