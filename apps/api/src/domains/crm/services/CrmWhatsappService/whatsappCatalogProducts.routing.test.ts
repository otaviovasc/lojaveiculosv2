import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { CrmConversationCycle } from "../../ports/crmConversationRepository.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";

vi.mock("../../messaging/sendOutboundMessage.js", () => ({
  sendOutboundMessage: vi.fn(),
}));

import { listWhatsappCatalogProducts } from "./whatsappCatalogProducts.js";

const storeId = "store-1";
const tenantId = "tenant-1";

describe("CRM WhatsApp catalog read routing", () => {
  it("resolves the cycle-bound route with catalog capability before reading", async () => {
    const fixture = createFixture(true);

    await expect(
      listWhatsappCatalogProducts(
        fixture.context,
        { cycleId: "cycle-1" },
        fixture.ports,
      ),
    ).resolves.toMatchObject({ catalogPhone: "5511999999999" });

    expect(fixture.listConnections).toHaveBeenCalledWith({ storeId, tenantId });
    expect(fixture.findConnectionById).toHaveBeenCalledWith("connection-1");
    expect(fixture.listCatalogProducts).toHaveBeenCalledWith(
      expect.objectContaining({ id: "connection-1" }),
      { catalogPhone: "5511999999999" },
    );
  });

  it("does not call the provider when catalog capability is absent", async () => {
    const fixture = createFixture(false);

    await expect(
      listWhatsappCatalogProducts(
        fixture.context,
        { cycleId: "cycle-1" },
        fixture.ports,
      ),
    ).rejects.toMatchObject({ reason: "capability_unsupported" });
    expect(fixture.listCatalogProducts).not.toHaveBeenCalled();
  });
});

function createFixture(catalog: boolean) {
  const context = createServiceContext({
    actor: { id: "actor-1", kind: "user" },
    entitlements: ["crm"],
    permissions: ["crm.conversations.read"],
    request: { requestId: "request-1" },
    storeId,
    tenantId,
  });
  const connection = crmConnection();
  const listConnections = vi.fn(async () => [
    {
      capabilities: { catalog },
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
  const listCatalogProducts = vi.fn(async () => ({
    cartEnabled: true,
    nextCursor: null,
    products: [],
    raw: {},
  }));
  const ports = {
    crmConnectionRepository: { findConnectionById } as never,
    crmConversationRepository: {
      listConversationCycles: vi.fn(async () => [conversationCycle()]),
    } as never,
    crmMessagingGateway: { listCatalogProducts } as never,
    crmRepository: {} as never,
    crmRoutingConnectionRepository: { listConnections },
  } satisfies CrmServicePorts;

  return {
    context,
    findConnectionById,
    listCatalogProducts,
    listConnections,
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
