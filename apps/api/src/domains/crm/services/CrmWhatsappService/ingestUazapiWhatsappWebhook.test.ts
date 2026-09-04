import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";

const dependencies = vi.hoisted(() => ({
  ingestUazapiProfilePhoto: vi.fn(),
  mirrorUazapiWhatsappMedia: vi.fn(),
  persistUazapiWhatsappWebhook: vi.fn(),
  publish: vi.fn(),
  readUazapiConnection: vi.fn(),
}));

vi.mock("../../whatsapp/mirrorUazapiWhatsappMedia.js", () => ({
  mirrorUazapiWhatsappMedia: dependencies.mirrorUazapiWhatsappMedia,
}));
vi.mock("../../whatsapp/uazapiProfilePhotoIngestion.js", () => ({
  ingestUazapiProfilePhoto: dependencies.ingestUazapiProfilePhoto,
}));
vi.mock("../../whatsapp/persistUazapiWhatsappWebhook.js", () => ({
  persistUazapiWhatsappWebhook: dependencies.persistUazapiWhatsappWebhook,
}));
vi.mock("./uazapiWebhookSupport.js", () => ({
  auditUazapiWebhook: vi.fn(),
  readUazapiConnection: dependencies.readUazapiConnection,
}));
vi.mock("../CrmService/serviceSupport.js", () => ({
  getCrmConversationRepository: () => ({
    findMessageByExternalId: vi.fn(async () => null),
  }),
  getCrmMediaStorage: () => null,
  getCrmRealtimePublisher: () => ({ publish: dependencies.publish }),
}));
vi.mock("../CrmMessagingService/serviceSupport.js", () => ({
  logCrmServiceEvent: vi.fn(),
  recordCrmServiceMutation: vi.fn(
    async (
      _context: unknown,
      _input: unknown,
      action: () => Promise<unknown>,
    ) => action(),
  ),
}));
vi.mock("../../whatsapp/publishZapiWhatsappAttendance.js", () => ({
  publishZapiWhatsappAttendanceEnded: vi.fn(),
  publishZapiWhatsappAttendanceStarted: vi.fn(),
}));
vi.mock("../../bot/externalBotEventForwarding.js", () => ({
  enqueueCrmMessageExternalBotEvent: vi.fn(),
}));

import { ingestUazapiWhatsappWebhook } from "./ingestUazapiWhatsappWebhook.js";

describe("ingestUazapiWhatsappWebhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.readUazapiConnection.mockResolvedValue(connection());
    dependencies.publish.mockResolvedValue(undefined);
    dependencies.mirrorUazapiWhatsappMedia.mockResolvedValue({
      metadata: {},
    });
    dependencies.ingestUazapiProfilePhoto.mockResolvedValue({
      status: "unavailable",
    });
    dependencies.persistUazapiWhatsappWebhook.mockResolvedValue({
      attendanceTransition: null,
      result: {
        conversationCycle: { id: "cycle-1" },
        createdMessage: true,
        message: { id: "message-1" },
      },
      transition: {},
    });
  });

  it("persists and publishes an inbound text message", async () => {
    const result = await ingestUazapiWhatsappWebhook(
      context(),
      {
        connectionId: "connection-1",
        payload: {
          data: {
            chatid: "5511999999999@s.whatsapp.net",
            messageTimestamp: 1_783_029_600_000,
            messageType: "conversation",
            messageid: "uazapi-text-1",
            senderName: "Ana",
            text: "Ola",
          },
          event: "message",
          instance: "instance-1",
        },
      },
      ports(),
    );

    expect(result).toMatchObject({ status: "stored" });
    expect(dependencies.persistUazapiWhatsappWebhook).toHaveBeenCalledOnce();
    const persistInput: unknown =
      dependencies.persistUazapiWhatsappWebhook.mock.calls[0]?.[1];
    expect(persistInput).toMatchObject({
      parsed: {
        content: "Ola",
        externalId: "uazapi-text-1",
        phone: "5511999999999",
      },
      profilePhoto: { status: "unavailable" },
    });
    expect(dependencies.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: "message" }),
    );
  });

  it("marks media mirroring as pending before background mirroring", async () => {
    dependencies.mirrorUazapiWhatsappMedia.mockReturnValue(
      new Promise(() => {}),
    );
    dependencies.ingestUazapiProfilePhoto.mockReturnValue(
      new Promise(() => {}),
    );

    const ingestion = ingestUazapiWhatsappWebhook(
      context(),
      {
        connectionId: "connection-1",
        payload: {
          data: {
            caption: "Foto",
            chatid: "5511999999999@s.whatsapp.net",
            fileURL: "https://uazapi.test/media/photo.jpg",
            messageTimestamp: 1_783_029_600_000,
            messageType: "imageMessage",
            messageid: "uazapi-image-1",
            mimetype: "image/jpeg",
          },
          event: "message",
        },
      },
      ports(),
    );

    await vi.waitFor(() =>
      expect(dependencies.persistUazapiWhatsappWebhook).toHaveBeenCalledOnce(),
    );
    await expect(ingestion).resolves.toMatchObject({ status: "stored" });
    const persistInput: unknown =
      dependencies.persistUazapiWhatsappWebhook.mock.calls[0]?.[1];
    expect(persistInput).toMatchObject({
      media: { metadata: { media: { mirrorStatus: "pending" } } },
    });
    await vi.waitFor(() =>
      expect(dependencies.mirrorUazapiWhatsappMedia).toHaveBeenCalledOnce(),
    );
  });

  it("ignores non-message payloads", async () => {
    const result = await ingestUazapiWhatsappWebhook(
      context(),
      {
        connectionId: "connection-1",
        payload: { data: { connected: true }, event: "connection" },
      },
      ports(),
    );

    expect(result).toEqual({ reason: "not_processable", status: "ignored" });
    expect(dependencies.persistUazapiWhatsappWebhook).not.toHaveBeenCalled();
  });

  it("ignores webhooks for unknown connections", async () => {
    dependencies.readUazapiConnection.mockResolvedValue(null);

    const result = await ingestUazapiWhatsappWebhook(
      context(),
      {
        connectionId: "connection-unknown",
        payload: {
          data: {
            chatid: "5511999999999@s.whatsapp.net",
            messageid: "uazapi-text-2",
            text: "Ola",
          },
          event: "message",
        },
      },
      ports(),
    );

    expect(result).toEqual({
      reason: "connection_not_found",
      status: "ignored",
    });
  });
});

function context() {
  return createServiceContext({
    actor: { id: "uazapi", kind: "integration" },
    permissions: ["crm.messages.ingest"],
    request: { requestId: "request-1" },
  });
}

function connection(): CrmConnection {
  return {
    broker: "direct",
    channel: "whatsapp",
    credentialsRef: {},
    displayName: "Uazapi",
    externalConnectionId: null,
    externalInstanceId: null,
    id: "connection-1",
    metadata: {},
    phone: null,
    provider: "uazapi",
    status: "active",
    storeId: "store-1" as never,
    tenantId: "tenant-1" as never,
    webhookUrl: null,
  };
}

function ports(): CrmServicePorts {
  return { crmRepository: {} as never };
}
