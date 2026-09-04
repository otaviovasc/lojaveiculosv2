import { Buffer } from "node:buffer";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type {
  ObjectStorage,
  PutStorageObjectInput,
} from "../../../shared/storage/objectStorage.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createConfiguredZapiTestConnection } from "./crm.channelConnections.testSupport.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import { createTestCrmAudioNormalizer } from "./crm.messages.sendMedia.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";

describe("CRM quick messages", () => {
  it("starts without system default templates", async () => {
    const response = await createTestApp().request(
      "/api/v1/crm/quick-messages",
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
  });

  it("creates text and audio dealership templates", async () => {
    const { normalizer } = createTestCrmAudioNormalizer();
    const app = createTestApp({
      crmAudioNormalizer: normalizer,
      crmMediaStorage: createTestObjectStorage().storage,
    });

    const text = await postJson(app, "/api/v1/crm/quick-messages", {
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

    const audio = await postJson(app, "/api/v1/crm/quick-messages", {
      kind: "AUDIO",
      mediaBase64: Buffer.from("audio-bytes").toString("base64"),
      mediaFileName: "boas-vindas.webm",
      mediaType: "audio/webm; codecs=opus",
      shortcut: "/audio",
      title: "Audio de boas-vindas",
    });
    expect(audio.status).toBe(201);
    await expect(audio.json()).resolves.toMatchObject({
      kind: "AUDIO",
      mediaType: "audio/ogg; codecs=opus",
      mediaUrl: "https://cdn.local/boas-vindas.ogg",
      shortcut: "/audio",
    });
  });

  it("sends an image template through the outbound media flow", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await seedCycle(conversationRepository);
    const sendMedia = vi.fn(async () => ({
      externalId: "zapi-quick-image-outbound",
      providerTimestamp: new Date("2026-07-02T21:00:00.000Z"),
      raw: { messageId: "zapi-quick-image-outbound" },
    }));
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmMessagingGateway: {
        sendMedia,
      },
      crmMediaStorage: createTestObjectStorage().storage,
      crmConversationRepository: conversationRepository,
    });

    const created = await postJson(app, "/api/v1/crm/quick-messages", {
      content: "Foto do painel.",
      kind: "IMAGE",
      mediaBase64: Buffer.from("image-bytes").toString("base64"),
      mediaFileName: "painel.jpg",
      mediaType: "image/jpeg",
      shortcut: "/painel",
      title: "Foto do painel",
    });
    const template = (await created.json()) as { id: string };
    const sent = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/messages/quick/${template.id}`,
      {
        body: JSON.stringify({}),
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "quick-image-1",
        },
        method: "POST",
      },
    );

    expect(sent.status).toBe(201);
    await expect(sent.json()).resolves.toMatchObject({
      clientRequestId: "quick-image-1",
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
        mimeType: "image/jpeg",
        phone: "5511999999999",
      },
    );
  });

  it("blocks legacy WebM audio templates before provider submission", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await seedCycle(conversationRepository);
    const legacy = await conversationRepository.createQuickMessage({
      content: "",
      createdByUserId: "legacy-user" as never,
      kind: "AUDIO",
      mediaType: "audio/webm",
      mediaUrl: "https://cdn.local/legacy.webm",
      shortcut: "/legacy-audio",
      sortOrder: 1,
      storageKey: "crm-whatsapp/legacy.webm",
      storeId,
      tenantId,
      title: "Legacy audio",
    });
    const sendMedia = vi.fn();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmConversationRepository: conversationRepository,
      crmMessagingGateway: { sendMedia },
    });

    const response = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/messages/quick/${legacy.id}`,
      {
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "CRM_MESSAGING_PROVIDER_ERROR",
    });
    expect(sendMedia).not.toHaveBeenCalled();
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

function seedCycle(
  conversationRepository: ReturnType<
    typeof createMemoryCrmConversationRepository
  >,
) {
  return conversationRepository.ingestMessage({
    customerDisplayName: "Ana",
    customerPhone: "5511999999999",
    channel: "WHATSAPP",
    connectionId,
    content: "Ola",
    direction: "INBOUND",
    externalId: "inbound-quick-message-send",
    metadata: {},
    providerTimestamp: new Date("2026-07-02T20:00:00.000Z"),
    senderOrigin: "customer",
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
  return createConfiguredZapiTestConnection({
    id: connectionId,
    overrides,
    storeId,
    tenantId,
  });
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
