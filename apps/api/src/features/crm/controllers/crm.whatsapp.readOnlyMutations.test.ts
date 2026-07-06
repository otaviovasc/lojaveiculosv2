import type { PermissionKey, StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmWhatsappGateway } from "../../../domains/crm/ports/crmWhatsappGateway.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  createTestApp,
  expectApiError,
} from "./crm.whatsapp.controller.testSupport.js";

const connectionId = "24000000-0000-4000-8000-000000000101";
const readOnlyPermissions = [
  "crm.whatsapp.list",
  "crm.whatsapp.read",
] satisfies PermissionKey[];
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("CRM WhatsApp read-only mutation permissions", () => {
  it("forbids every send-class route for read-only store users", async () => {
    const gateway = createGatewaySpies();
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const inbound = await whatsappRepository.ingestMessage({
      buyerName: "Eva",
      buyerPhone: "5511999999905",
      channel: "WHATSAPP",
      connectionId,
      content: "Pode me chamar?",
      direction: "INBOUND",
      externalId: "read-only-inbound",
      metadata: {},
      providerTimestamp: new Date("2026-07-03T12:10:00.000Z"),
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    const sessionId = inbound.session.id;
    const messageId = String(inbound.message.id);
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappGateway: gateway,
      crmWhatsappRepository: whatsappRepository,
      permissions: readOnlyPermissions,
    });

    for (const route of readOnlyRoutes(sessionId, messageId)) {
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

function readOnlyRoutes(sessionId: string, messageId: string) {
  return [
    {
      init: jsonPost({ sessionId, text: "Ola" }),
      name: "send text",
      path: "/api/v1/crm/whatsapp/send/text",
      permission: "crm.whatsapp.send",
    },
    {
      init: jsonPost({
        connectionId,
        phone: "11999999999",
        text: "Ola",
      }),
      name: "start conversation",
      path: "/api/v1/crm/whatsapp/conversations/start",
      permission: "crm.whatsapp.send",
    },
    {
      init: jsonPost({ base64: "aGk=", mediaType: "image", sessionId }),
      name: "send media",
      path: "/api/v1/crm/whatsapp/send/media",
      permission: "crm.whatsapp.send",
    },
    {
      init: jsonPost({ latitude: -23.5, longitude: -46.6, sessionId }),
      name: "send location",
      path: "/api/v1/crm/whatsapp/send/location",
      permission: "crm.whatsapp.send",
    },
    {
      init: jsonPost({ sessionId, title: "Catalogo" }),
      name: "send catalog",
      path: "/api/v1/crm/whatsapp/send/catalog",
      permission: "crm.whatsapp.send",
    },
    {
      init: jsonPost({ productId: "product_1", sessionId }),
      name: "send product",
      path: "/api/v1/crm/whatsapp/send/catalog/product",
      permission: "crm.whatsapp.send",
    },
    {
      init: jsonPost({ sessionId, title: "Honda Civic" }),
      name: "send vehicle",
      path: "/api/v1/crm/whatsapp/send/vehicle",
      permission: "crm.whatsapp.send",
    },
    {
      init: jsonPost({ name: "Quente" }),
      name: "add tag",
      path: `/api/v1/crm/whatsapp/sessions/${sessionId}/tags`,
      permission: "crm.whatsapp.tags.assign",
    },
    {
      init: { method: "DELETE" },
      name: "remove tag",
      path: `/api/v1/crm/whatsapp/sessions/${sessionId}/tags/tag_1`,
      permission: "crm.whatsapp.tags.assign",
    },
    {
      init: jsonPost({ content: "Ola", shortcut: "/ola", title: "Ola" }),
      name: "create quick message",
      path: "/api/v1/crm/whatsapp/quick-messages",
      permission: "crm.whatsapp.send",
    },
    {
      init: jsonPatch({ title: "Ola editado" }),
      name: "update quick message",
      path: "/api/v1/crm/whatsapp/quick-messages/quick_1",
      permission: "crm.whatsapp.send",
    },
    {
      init: { method: "DELETE" },
      name: "delete quick message",
      path: "/api/v1/crm/whatsapp/quick-messages/quick_1",
      permission: "crm.whatsapp.send",
    },
    {
      init: jsonPost({ sessionId }),
      name: "send quick message",
      path: "/api/v1/crm/whatsapp/quick-messages/quick_1/send",
      permission: "crm.whatsapp.send",
    },
    {
      init: jsonPost({ reaction: "ok" }),
      name: "send reaction",
      path: `/api/v1/crm/whatsapp/messages/${messageId}/reaction`,
      permission: "crm.whatsapp.send",
    },
    {
      init: { method: "DELETE" },
      name: "remove reaction",
      path: `/api/v1/crm/whatsapp/messages/${messageId}/reaction`,
      permission: "crm.whatsapp.send",
    },
    {
      init: { method: "DELETE" },
      name: "delete message",
      path: `/api/v1/crm/whatsapp/messages/${messageId}`,
      permission: "crm.whatsapp.send",
    },
    {
      init: { method: "POST" },
      name: "retry provider event",
      path: "/api/v1/crm/whatsapp/provider-events/event_1/retry",
      permission: "crm.whatsapp.send",
    },
  ];
}

function createGatewaySpies(): CrmWhatsappGateway {
  return {
    deleteMessage: vi.fn<CrmWhatsappGateway["deleteMessage"]>(),
    getConnectionStatus: vi.fn<CrmWhatsappGateway["getConnectionStatus"]>(),
    listCatalogProducts: vi.fn<CrmWhatsappGateway["listCatalogProducts"]>(),
    removeReaction: vi.fn<CrmWhatsappGateway["removeReaction"]>(),
    sendCatalog: vi.fn<CrmWhatsappGateway["sendCatalog"]>(),
    sendMedia: vi.fn<CrmWhatsappGateway["sendMedia"]>(),
    sendProduct: vi.fn<CrmWhatsappGateway["sendProduct"]>(),
    sendReaction: vi.fn<CrmWhatsappGateway["sendReaction"]>(),
    sendText: vi.fn<CrmWhatsappGateway["sendText"]>(),
  };
}

function gatewayWasCalled(gateway: CrmWhatsappGateway) {
  return Object.values(gateway).some(
    (method) => vi.mocked(method).mock.calls.length > 0,
  );
}

function createZapiConnection(): CrmConnection {
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
