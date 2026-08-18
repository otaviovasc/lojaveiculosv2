import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type {
  CrmConversationCycle,
  CrmMessage,
} from "../../ports/crmConversationRepository.js";
import type { CrmRoutingConnectionCapability } from "../../ports/crmRoutingConnectionRepository.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import {
  deleteCrmMessageDto,
  removeCrmReaction,
  sendCrmReaction,
} from "./crmMessageActions.js";

const storeId = "store-1";
const tenantId = "tenant-1";

describe("CRM WhatsApp message action routing", () => {
  it.each([
    ["reaction", "reactions"],
    ["remove_reaction", "reactions"],
    ["delete", "delete"],
  ] as const)(
    "resolves the bound connection with the exact capability for %s",
    async (action, capability) => {
      const fixture = createFixture([capability]);

      if (action === "reaction") {
        await sendCrmReaction(
          fixture.context,
          { messageId: fixture.message.id, reaction: "👍" },
          fixture.ports,
        );
        expect(fixture.gateway.sendReaction).toHaveBeenCalledOnce();
      } else if (action === "remove_reaction") {
        await removeCrmReaction(
          fixture.context,
          { messageId: fixture.message.id },
          fixture.ports,
        );
        expect(fixture.gateway.removeReaction).toHaveBeenCalledOnce();
      } else {
        await deleteCrmMessageDto(
          fixture.context,
          { messageId: fixture.message.id },
          fixture.ports,
        );
        expect(fixture.gateway.deleteMessage).toHaveBeenCalledOnce();
      }

      expect(fixture.listConnections).toHaveBeenCalledWith({
        storeId,
        tenantId,
      });
      expect(fixture.findConnectionById).toHaveBeenCalledWith("connection-1");
    },
  );

  it("blocks the provider call when the bound route lacks reactions", async () => {
    const fixture = createFixture([]);

    await expect(
      sendCrmReaction(
        fixture.context,
        { messageId: fixture.message.id, reaction: "👍" },
        fixture.ports,
      ),
    ).rejects.toMatchObject({ reason: "capability_unsupported" });
    expect(fixture.gateway.sendReaction).not.toHaveBeenCalled();
  });
});

function createFixture(
  capabilities: readonly CrmRoutingConnectionCapability[],
) {
  const context = createServiceContext({
    actor: { id: "actor-1", kind: "user" },
    entitlements: ["crm"],
    permissions: ["crm.messages.send"],
    request: { requestId: "request-1" },
    storeId,
    tenantId,
  });
  const cycle = conversationCycle();
  const message = crmMessage(cycle.id);
  const connection = crmConnection();
  const listConnections = vi.fn(async () => [
    {
      capabilities: Object.fromEntries(
        capabilities.map((capability) => [capability, true]),
      ),
      channel: "whatsapp" as const,
      connected: true,
      credentialBroker: "direct" as const,
      degraded: false,
      displayName: "Principal",
      errorCode: null,
      id: connection.id,
      provider: "zapi" as const,
      state: "active" as const,
      storeId: storeId as never,
      tenantId: tenantId as never,
    },
  ]);
  const findConnectionById = vi.fn(async () => connection);
  const gateway = {
    deleteMessage: vi.fn(async () => ({ deleted: true })),
    removeReaction: vi.fn(async () => ({
      externalId: "removed-1",
      providerTimestamp: new Date("2026-08-18T12:00:00.000Z"),
      raw: {},
    })),
    sendReaction: vi.fn(async () => ({
      externalId: "reaction-1",
      providerTimestamp: new Date("2026-08-18T12:00:00.000Z"),
      raw: {},
    })),
  };
  const ports = {
    crmConnectionRepository: { findConnectionById } as never,
    crmConversationRepository: {
      findMessageById: vi.fn(async () => message),
      listConversationCycles: vi.fn(async () => [cycle]),
      updateMessage: vi.fn(async () => message),
    } as never,
    crmMessagingGateway: gateway as never,
    crmRepository: {} as never,
    crmRoutingConnectionRepository: { listConnections },
  } satisfies CrmServicePorts;

  return {
    connection,
    context,
    findConnectionById,
    gateway,
    listConnections,
    message,
    ports,
  };
}

function crmConnection(): CrmConnection {
  return {
    broker: "direct",
    channel: "whatsapp",
    credentialsRef: {},
    displayName: "Principal",
    externalConnectionId: null,
    externalInstanceId: null,
    id: "connection-1",
    metadata: {},
    phone: "5511999999999",
    provider: "zapi",
    status: "active",
    storeId: storeId as never,
    tenantId: tenantId as never,
    webhookUrl: null,
  };
}

function crmMessage(cycleId: string): CrmMessage {
  const now = new Date("2026-08-18T12:00:00.000Z");
  return {
    channel: "WHATSAPP",
    channelMessageId: null,
    connectionId: "connection-1",
    content: "Olá",
    createdAt: now,
    deletedAt: null,
    direction: "INBOUND",
    externalId: "provider-message-1",
    id: "message-1",
    mediaType: null,
    mediaUrl: null,
    metadata: {},
    providerTimestamp: now,
    senderOrigin: "customer",
    senderType: "CUSTOMER",
    cycleId,
    status: "DELIVERED",
    storeId: storeId as never,
    tenantId: tenantId as never,
    type: "TEXT",
    updatedAt: now,
  };
}

function conversationCycle(): CrmConversationCycle {
  const now = new Date("2026-08-18T12:00:00.000Z");
  return {
    assignedUserId: null,
    channel: "WHATSAPP",
    channelMetadata: {},
    connectionId: "connection-1",
    createdAt: now,
    customerChatId: null,
    customerDisplayName: "Cliente",
    customerPhone: "5511999999999",
    externalCycleId: null,
    externalThreadId: null,
    firstHandledAt: null,
    freshLeadAt: null,
    humanAttendanceChangedAt: null,
    humanAttendanceState: null,
    humanAttendanceStateVersion: null,
    humanHandlingStartedAt: null,
    humanTakeoverAt: null,
    id: "cycle-1",
    interventionId: null,
    lastAssignedAt: null,
    lastCustomerReadAt: null,
    lastMessageAt: now,
    lastMessageContent: "Olá",
    lastReadAt: null,
    leadId: null,
    messageCount: 1,
    metadata: {},
    profilePhotoUrl: null,
    revision: 1,
    source: null,
    status: "ACTIVE",
    storeId: storeId as never,
    tags: [],
    tenantId: tenantId as never,
    unreadCount: 1,
    updatedAt: now,
  };
}
