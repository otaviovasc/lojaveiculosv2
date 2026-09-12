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

describe("ingestUazapiWhatsappWebhook fromMe echoes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.readUazapiConnection.mockResolvedValue(connection());
    dependencies.publish.mockResolvedValue(undefined);
    dependencies.mirrorUazapiWhatsappMedia.mockResolvedValue({ metadata: {} });
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

  it("routes seller app echoes (fromMe without wasSentByApi) through the shared outbound pipeline", async () => {
    const result = await ingestUazapiWhatsappWebhook(
      context(),
      {
        connectionId: "connection-1",
        payload: {
          data: {
            chatid: "5511999999999@s.whatsapp.net",
            chatName: "Cliente",
            fromMe: true,
            messageTimestamp: 1_783_029_600_000,
            messageid: "uazapi-echo-1",
            sender: "5511000000000@s.whatsapp.net",
            text: "Resposta pelo app",
          },
          event: "message",
        },
      },
      ports(),
    );

    expect(result).toMatchObject({ status: "stored" });
    const persistInput: unknown =
      dependencies.persistUazapiWhatsappWebhook.mock.calls[0]?.[1];
    expect(persistInput).toMatchObject({
      parsed: {
        customerDisplayName: "Cliente",
        fromMe: true,
        phone: "5511999999999",
      },
    });
    expect(
      (persistInput as { parsed: { profilePhotoUrl?: string } }).parsed
        .profilePhotoUrl,
    ).toBeUndefined();
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
