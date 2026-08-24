import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";

const dependencies = vi.hoisted(() => ({
  ingestZapiProfilePhoto: vi.fn(),
  mirrorZapiWhatsappMedia: vi.fn(),
  persistZapiWhatsappWebhook: vi.fn(),
  publish: vi.fn(),
}));

vi.mock("../../whatsapp/mirrorZapiWhatsappMedia.js", () => ({
  mirrorZapiWhatsappMedia: dependencies.mirrorZapiWhatsappMedia,
}));
vi.mock("../../whatsapp/zapiProfilePhotoIngestion.js", () => ({
  ingestZapiProfilePhoto: dependencies.ingestZapiProfilePhoto,
}));
vi.mock("../../whatsapp/persistZapiWhatsappWebhook.js", () => ({
  persistZapiWhatsappWebhook: dependencies.persistZapiWhatsappWebhook,
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
  readZapiConnection: vi.fn(async () => connection()),
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

import { ingestZapiWhatsappWebhook } from "./ingestZapiWhatsappWebhook.js";

describe("ingestZapiWhatsappWebhook optional media", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.publish.mockResolvedValue(undefined);
    dependencies.persistZapiWhatsappWebhook.mockResolvedValue({
      attendanceTransition: null,
      result: {
        conversationCycle: { id: "cycle-1" },
        createdMessage: true,
        message: { id: "message-1" },
      },
      transition: {},
    });
  });

  it("persists and publishes while optional media and profile mirroring are pending", async () => {
    dependencies.mirrorZapiWhatsappMedia.mockReturnValue(new Promise(() => {}));
    dependencies.ingestZapiProfilePhoto.mockReturnValue(new Promise(() => {}));

    const ingestion = ingestZapiWhatsappWebhook(
      context(),
      {
        connectionId: "connection-1",
        payload: {
          image: {
            caption: "Foto",
            imageUrl: "https://zapi.test/media/photo.jpg",
            mimeType: "image/jpeg",
          },
          messageId: "message-external-1",
          phone: "5511999999999",
          senderPhoto: "https://zapi.test/profile/photo.jpg",
          timestamp: 1_783_029_600,
        },
      },
      ports(),
    );

    await vi.waitFor(() =>
      expect(dependencies.persistZapiWhatsappWebhook).toHaveBeenCalledOnce(),
    );
    await expect(ingestion).resolves.toMatchObject({ status: "stored" });
    expect(dependencies.mirrorZapiWhatsappMedia).toHaveBeenCalledOnce();
    expect(dependencies.ingestZapiProfilePhoto).toHaveBeenCalledOnce();
    const persistInput: unknown =
      dependencies.persistZapiWhatsappWebhook.mock.calls[0]?.[1];
    expect(persistInput).toMatchObject({
      media: { metadata: { media: { mirrorStatus: "pending" } } },
      profilePhoto: { status: "unavailable" },
    });
    expect(dependencies.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: "message" }),
    );
  });
});

function context() {
  return createServiceContext({
    actor: { id: "zapi", kind: "integration" },
    permissions: ["crm.messages.ingest"],
    request: { requestId: "request-1" },
  });
}

function connection(): CrmConnection {
  return {
    broker: "direct",
    channel: "whatsapp",
    credentialsRef: {},
    displayName: "Z-API",
    externalConnectionId: null,
    externalInstanceId: null,
    id: "connection-1",
    metadata: {},
    phone: null,
    provider: "zapi",
    status: "active",
    storeId: "store-1" as never,
    tenantId: "tenant-1" as never,
    webhookUrl: null,
  };
}

function ports(): CrmServicePorts {
  return { crmRepository: {} as never };
}
