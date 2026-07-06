import { describe, expect, it } from "vitest";
import {
  createCrmWhatsappSessionQuery,
  crmWhatsappRoutes,
} from "./crmWhatsappApi";

describe("CRM WhatsApp API routes", () => {
  it("builds V2 WhatsApp routes", () => {
    expect(crmWhatsappRoutes.connections()).toBe(
      "/api/v1/crm/whatsapp/connections",
    );
    expect(crmWhatsappRoutes.conversationsStart()).toBe(
      "/api/v1/crm/whatsapp/conversations/start",
    );
    expect(crmWhatsappRoutes.sessions()).toBe("/api/v1/crm/whatsapp/sessions");
    expect(crmWhatsappRoutes.sessionCounts()).toBe(
      "/api/v1/crm/whatsapp/session-counts",
    );
    expect(crmWhatsappRoutes.messages("session-uuid")).toBe(
      "/api/v1/crm/whatsapp/messages/session-uuid",
    );
    expect(crmWhatsappRoutes.message("message-uuid")).toBe(
      "/api/v1/crm/whatsapp/messages/message-uuid",
    );
    expect(crmWhatsappRoutes.messageReaction("message-uuid")).toBe(
      "/api/v1/crm/whatsapp/messages/message-uuid/reaction",
    );
    expect(crmWhatsappRoutes.assignSession("session-uuid")).toBe(
      "/api/v1/crm/whatsapp/sessions/session-uuid/assign",
    );
    expect(crmWhatsappRoutes.closeSession("session-uuid")).toBe(
      "/api/v1/crm/whatsapp/sessions/session-uuid/close",
    );
    expect(crmWhatsappRoutes.interveneSession("session-uuid")).toBe(
      "/api/v1/crm/whatsapp/sessions/session-uuid/intervention",
    );
    expect(crmWhatsappRoutes.markSessionRead("session-uuid")).toBe(
      "/api/v1/crm/whatsapp/sessions/session-uuid/read",
    );
    expect(crmWhatsappRoutes.markSessionUnread("session-uuid")).toBe(
      "/api/v1/crm/whatsapp/sessions/session-uuid/unread",
    );
    expect(crmWhatsappRoutes.quickMessages()).toBe(
      "/api/v1/crm/whatsapp/quick-messages",
    );
    expect(crmWhatsappRoutes.quickMessage("quick_1")).toBe(
      "/api/v1/crm/whatsapp/quick-messages/quick_1",
    );
    expect(crmWhatsappRoutes.providerEventIssues()).toBe(
      "/api/v1/crm/whatsapp/provider-events/issues",
    );
    expect(crmWhatsappRoutes.retryProviderEvent("event_1")).toBe(
      "/api/v1/crm/whatsapp/provider-events/event_1/retry",
    );
    expect(crmWhatsappRoutes.sessionTags("session-uuid")).toBe(
      "/api/v1/crm/whatsapp/sessions/session-uuid/tags",
    );
    expect(crmWhatsappRoutes.sessionTag("session-uuid", "tag-uuid")).toBe(
      "/api/v1/crm/whatsapp/sessions/session-uuid/tags/tag-uuid",
    );
    expect(crmWhatsappRoutes.sendCatalog()).toBe(
      "/api/v1/crm/whatsapp/send/catalog",
    );
    expect(crmWhatsappRoutes.sendLocation()).toBe(
      "/api/v1/crm/whatsapp/send/location",
    );
    expect(crmWhatsappRoutes.sendText()).toBe("/api/v1/crm/whatsapp/send/text");
    expect(crmWhatsappRoutes.sendMedia()).toBe(
      "/api/v1/crm/whatsapp/send/media",
    );
    expect(crmWhatsappRoutes.sendQuickMessage("quick_1")).toBe(
      "/api/v1/crm/whatsapp/quick-messages/quick_1/send",
    );
    expect(crmWhatsappRoutes.sendVehicle()).toBe(
      "/api/v1/crm/whatsapp/send/vehicle",
    );
  });

  it("serializes inbox session queries", () => {
    expect(
      createCrmWhatsappSessionQuery({
        connectionId: "connection_1",
        filter: "fresh",
        limit: 40,
        offset: 80,
        search: "maria",
        sessionId: "session_1",
        status: "ACTIVE",
        tagIds: [
          "550e8400-e29b-41d4-a716-446655440000",
          "550e8400-e29b-41d4-a716-446655440001",
        ],
        unreadOnly: true,
      }).toString(),
    ).toBe(
      "connectionId=connection_1&filter=fresh&limit=40&offset=80&search=maria&sessionId=session_1&status=ACTIVE&tagIds=550e8400-e29b-41d4-a716-446655440000%2C550e8400-e29b-41d4-a716-446655440001&unreadOnly=true",
    );
  });
});
