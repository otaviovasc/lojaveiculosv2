import type { PermissionKey, StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmMessagingGateway } from "../../../domains/crm/ports/crmMessagingGateway.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createTestApp, expectApiError } from "./crm.controller.testSupport.js";

const connectionId = "24000000-0000-4000-8000-000000000101";
const readOnlyPermissions = [
  "crm.conversations.read",
  "crm.conversations.read",
] satisfies PermissionKey[];
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("CRM messaging read-only mutation permissions", () => {
  it("forbids every send-class route for read-only store users", async () => {
    const gateway = createGatewaySpies();
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await conversationRepository.ingestMessage({
      customerDisplayName: "Eva",
      customerPhone: "5511999999905",
      channel: "WHATSAPP",
      connectionId,
      content: "Pode me chamar?",
      direction: "INBOUND",
      externalId: "read-only-inbound",
      metadata: {},
      providerTimestamp: new Date("2026-07-03T12:10:00.000Z"),
      senderOrigin: "customer",
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    const cycleId = inbound.conversationCycle.id;
    const messageId = String(inbound.message.id);
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmMessagingGateway: gateway,
      crmConversationRepository: conversationRepository,
      permissions: readOnlyPermissions,
    });

    for (const route of readOnlyRoutes(cycleId, messageId)) {
      const response = await app.request(route.path, route.init);

      expect(response.status, route.name).toBe(403);
      await expectApiError(response, {
        code: "AUTHORIZATION_DENIED",
        message: `Missing permission: ${route.permission}`,
      });
    }
    expect(gatewayWasCalled(gateway)).toBe(false);
  });
});

function readOnlyRoutes(cycleId: string, messageId: string) {
  return [
    {
      init: jsonPost({ content: "Ola" }),
      name: "send text",
      path: `/api/v1/crm/conversation-cycles/${cycleId}/messages`,
      permission: "crm.messages.send",
    },
    {
      init: jsonPost({
        channel: "whatsapp",
        recipientAddress: "11999999999",
        text: "Ola",
      }),
      name: "start conversation",
      path: "/api/v1/crm/conversation-cycles",
      permission: "crm.messages.send",
    },
    {
      init: jsonPost({ base64: "aGk=", mediaType: "image" }),
      name: "send media",
      path: `/api/v1/crm/conversation-cycles/${cycleId}/messages/media`,
      permission: "crm.messages.send",
    },
    {
      init: jsonPost({ latitude: -23.5, longitude: -46.6, cycleId }),
      name: "send location",
      path: "/api/v1/crm/whatsapp/send/location",
      permission: "crm.messages.send",
    },
    {
      init: jsonPost({ cycleId, title: "Catalogo" }),
      name: "send catalog",
      path: "/api/v1/crm/whatsapp/send/catalog",
      permission: "crm.messages.send",
    },
    {
      init: jsonPost({ productId: "product_1", cycleId }),
      name: "send product",
      path: "/api/v1/crm/whatsapp/send/catalog/product",
      permission: "crm.messages.send",
    },
    {
      init: jsonPost({ cycleId, title: "Honda Civic" }),
      name: "send vehicle",
      path: "/api/v1/crm/whatsapp/send/vehicle",
      permission: "crm.messages.send",
    },
    {
      init: jsonPost({ name: "Quente" }),
      name: "add tag",
      path: `/api/v1/crm/conversation-cycles/${cycleId}/tags`,
      permission: "crm.tags.assign",
    },
    {
      init: { method: "DELETE" },
      name: "remove tag",
      path: `/api/v1/crm/conversation-cycles/${cycleId}/tags/tag_1`,
      permission: "crm.tags.assign",
    },
    {
      init: jsonPost({ content: "Ola", shortcut: "/ola", title: "Ola" }),
      name: "create quick message",
      path: "/api/v1/crm/quick-messages",
      permission: "crm.messages.send",
    },
    {
      init: jsonPatch({ title: "Ola editado" }),
      name: "update quick message",
      path: "/api/v1/crm/quick-messages/quick_1",
      permission: "crm.messages.send",
    },
    {
      init: { method: "DELETE" },
      name: "delete quick message",
      path: "/api/v1/crm/quick-messages/quick_1",
      permission: "crm.messages.send",
    },
    {
      init: jsonPost({ cycleId }),
      name: "send quick message",
      path: `/api/v1/crm/conversation-cycles/${cycleId}/messages/quick/quick_1`,
      permission: "crm.messages.send",
    },
    {
      init: jsonPost({ reaction: "ok" }),
      name: "send reaction",
      path: `/api/v1/crm/messages/${messageId}/reaction`,
      permission: "crm.messages.send",
    },
    {
      init: { method: "DELETE" },
      name: "remove reaction",
      path: `/api/v1/crm/messages/${messageId}/reaction`,
      permission: "crm.messages.send",
    },
    {
      init: { method: "DELETE" },
      name: "delete message",
      path: `/api/v1/crm/messages/${messageId}`,
      permission: "crm.messages.send",
    },
    {
      init: { method: "POST" },
      name: "retry provider event",
      path: "/api/v1/crm/provider-events/event_1/retry",
      permission: "crm.messages.send",
    },
  ];
}

function createGatewaySpies(): CrmMessagingGateway {
  return {
    configureWebhooks: vi.fn<CrmMessagingGateway["configureWebhooks"]>(),
    deleteMessage: vi.fn<CrmMessagingGateway["deleteMessage"]>(),
    disconnectConnection: vi.fn<CrmMessagingGateway["disconnectConnection"]>(),
    getConnectionStatus: vi.fn<CrmMessagingGateway["getConnectionStatus"]>(),
    listCatalogProducts: vi.fn<CrmMessagingGateway["listCatalogProducts"]>(),
    removeReaction: vi.fn<CrmMessagingGateway["removeReaction"]>(),
    sendCatalog: vi.fn<CrmMessagingGateway["sendCatalog"]>(),
    sendMedia: vi.fn<CrmMessagingGateway["sendMedia"]>(),
    sendProduct: vi.fn<CrmMessagingGateway["sendProduct"]>(),
    sendReaction: vi.fn<CrmMessagingGateway["sendReaction"]>(),
    sendTemplate: vi.fn<CrmMessagingGateway["sendTemplate"]>(),
    sendText: vi.fn<CrmMessagingGateway["sendText"]>(),
  };
}

function gatewayWasCalled(gateway: CrmMessagingGateway) {
  return Object.values(gateway).some(
    (method) => vi.mocked(method).mock.calls.length > 0,
  );
}

function createZapiConnection(): CrmConnection {
  return {
    broker: "direct",
    channel: "whatsapp",
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
  };
}

function jsonPost(body: Record<string, unknown>) {
  return json("POST", body);
}

function jsonPatch(body: Record<string, unknown>) {
  return json("PATCH", body);
}

function json(method: "PATCH" | "POST", body: Record<string, unknown>) {
  return {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method,
  };
}
