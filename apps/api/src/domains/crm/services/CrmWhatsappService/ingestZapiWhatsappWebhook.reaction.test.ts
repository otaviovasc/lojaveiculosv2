import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";

const dependencies = vi.hoisted(() => ({
  findMessageByExternalId: vi.fn(),
  listConversationCycles: vi.fn(),
  persistZapiWhatsappWebhook: vi.fn(),
  publish: vi.fn(),
  updateMessage: vi.fn(),
}));

vi.mock("../../whatsapp/persistZapiWhatsappWebhook.js", () => ({
  persistZapiWhatsappWebhook: dependencies.persistZapiWhatsappWebhook,
}));
vi.mock("../CrmService/serviceSupport.js", () => ({
  getCrmConversationRepository: () => ({
    findMessageByExternalId: dependencies.findMessageByExternalId,
    listConversationCycles: dependencies.listConversationCycles,
    updateMessage: dependencies.updateMessage,
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

import { ingestZapiWhatsappWebhook } from "./ingestZapiWhatsappWebhook.js";

describe("ingestZapiWhatsappWebhook inbound reactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.publish.mockResolvedValue(undefined);
    dependencies.listConversationCycles.mockResolvedValue([{ id: "cycle-1" }]);
    dependencies.updateMessage.mockImplementation(async (input: unknown) => ({
      ...targetMessage(),
      metadata: (input as { metadata: Record<string, unknown> }).metadata,
    }));
  });

  it("attaches the reaction to the reacted message and inserts nothing", async () => {
    dependencies.findMessageByExternalId.mockResolvedValue(targetMessage());

    const result = await ingestZapiWhatsappWebhook(
      context(),
      {
        connectionId: "connection-1",
        payload: reactionPayload({ messageId: "target-ext-1", value: "❤️" }),
      },
      ports(),
    );

    expect(result).toMatchObject({
      conversationCycle: { id: "cycle-1" },
      status: "stored",
    });
    expect(dependencies.persistZapiWhatsappWebhook).not.toHaveBeenCalled();
    expect(dependencies.findMessageByExternalId).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: "connection-1",
        externalId: "target-ext-1",
      }),
    );
    const updateInput = dependencies.updateMessage.mock.calls[0]?.[0] as {
      messageId: string;
      metadata: { reaction?: Record<string, unknown> };
    };
    expect(updateInput.messageId).toBe("message-1");
    expect(updateInput.metadata.reaction).toMatchObject({
      origin: "inbound",
      senderPhone: "5511999999999",
      value: "❤️",
    });
    expect(dependencies.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: "message" }),
    );
  });

  it("removes the reaction from the target when the value is empty", async () => {
    dependencies.findMessageByExternalId.mockResolvedValue({
      ...targetMessage(),
      metadata: {
        reaction: {
          origin: "inbound",
          receivedAt: "2026-01-01T00:00:00.000Z",
          value: "❤️",
        },
      },
    });

    const result = await ingestZapiWhatsappWebhook(
      context(),
      {
        connectionId: "connection-1",
        payload: reactionPayload({ messageId: "target-ext-1", value: "" }),
      },
      ports(),
    );

    expect(result).toMatchObject({ status: "stored" });
    expect(dependencies.persistZapiWhatsappWebhook).not.toHaveBeenCalled();
    const updateInput = dependencies.updateMessage.mock.calls[0]?.[0] as {
      metadata: Record<string, unknown>;
    };
    expect(updateInput.metadata).not.toHaveProperty("reaction");
  });

  it("falls back to a standalone message when the target is not synced", async () => {
    dependencies.findMessageByExternalId.mockResolvedValue(null);
    dependencies.persistZapiWhatsappWebhook.mockResolvedValue({
      attendanceTransition: null,
      result: {
        conversationCycle: { id: "cycle-1" },
        createdMessage: true,
        message: { id: "message-standalone" },
      },
      transition: {},
    });

    const result = await ingestZapiWhatsappWebhook(
      context(),
      {
        connectionId: "connection-1",
        payload: reactionPayload({ messageId: "unknown-ext", value: "❤️" }),
      },
      ports(),
    );

    expect(result).toMatchObject({ status: "stored" });
    expect(dependencies.persistZapiWhatsappWebhook).toHaveBeenCalledOnce();
    expect(dependencies.updateMessage).not.toHaveBeenCalled();
  });
});

function reactionPayload(reaction: { messageId: string; value: string }) {
  return {
    messageId: "reaction-ext-1",
    phone: "5511999999999",
    reaction,
    timestamp: 1_783_029_600,
  };
}

function targetMessage() {
  return {
    cycleId: "cycle-1",
    externalId: "target-ext-1",
    id: "message-1",
    metadata: {},
  };
}

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
