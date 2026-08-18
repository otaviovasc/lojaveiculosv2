import { describe, expect, it } from "vitest";
import {
  createCrmWhatsappSessionQuery,
  crmWhatsappRoutes,
} from "./crmWhatsappApi";
import { createCrmWhatsappSessionCountsQuery } from "./crmWhatsappApiRoutes";

describe("CRM WhatsApp API routes", () => {
  it("builds V2 WhatsApp routes", () => {
    expect(crmWhatsappRoutes.connections()).toBe(
      "/api/v1/crm/channel-connections",
    );
    expect(crmWhatsappRoutes.connection("connection-1")).toBe(
      "/api/v1/crm/channel-connections/connection-1",
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
    expect(crmWhatsappRoutes.concludeSession("session-uuid")).toBe(
      "/api/v1/crm/whatsapp/sessions/session-uuid/conclusion",
    );
    expect(crmWhatsappRoutes.quickMessages()).toBe(
      "/api/v1/crm/whatsapp/quick-messages",
    );
    expect(crmWhatsappRoutes.botIntegration()).toBe(
      "/api/v1/crm/bot/configuration",
    );
    expect(crmWhatsappRoutes.routingPolicy()).toBe(
      "/api/v1/crm/routing-policy",
    );
    expect(crmWhatsappRoutes.olxChatSetupRetry("connection-1")).toBe(
      "/api/v1/crm/channel-connections/connection-1/olx-chat/setup/retry",
    );
    expect(crmWhatsappRoutes.composioAuthorize("connection-1")).toBe(
      "/api/v1/crm/channel-connections/connection-1/composio/authorize",
    );
    expect(crmWhatsappRoutes.composioComplete("connection-1")).toBe(
      "/api/v1/crm/channel-connections/connection-1/composio/complete",
    );
    expect(crmWhatsappRoutes.composioSender("connection-1")).toBe(
      "/api/v1/crm/channel-connections/connection-1/composio/sender",
    );
    expect(crmWhatsappRoutes.zapiDisconnect("connection-1")).toBe(
      "/api/v1/crm/channel-connections/connection-1/zapi/disconnect",
    );
    expect(crmWhatsappRoutes.zapiPairingCode("connection-1")).toBe(
      "/api/v1/crm/channel-connections/connection-1/zapi/pairing/code",
    );
    expect(crmWhatsappRoutes.zapiPairingQr("connection-1")).toBe(
      "/api/v1/crm/channel-connections/connection-1/zapi/pairing/qr",
    );
    expect(crmWhatsappRoutes.zapiStatusRefresh("connection-1")).toBe(
      "/api/v1/crm/channel-connections/connection-1/zapi/status/refresh",
    );
    expect(crmWhatsappRoutes.zapiWebhooksConfigure("connection-1")).toBe(
      "/api/v1/crm/channel-connections/connection-1/zapi/webhooks/configure",
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
        assigneeId: "03030303-0303-4303-8303-030303030303",
        connectionId: "connection_1",
        filter: "fresh",
        humanAttendanceState: "WAITING_HUMAN",
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
      "assigneeId=03030303-0303-4303-8303-030303030303&connectionId=connection_1&filter=fresh&humanAttendanceState=WAITING_HUMAN&limit=40&offset=80&search=maria&sessionId=session_1&status=ACTIVE&tagIds=550e8400-e29b-41d4-a716-446655440000%2C550e8400-e29b-41d4-a716-446655440001&unreadOnly=true",
    );
  });

  it("serializes only the V2 attendance field in count queries", () => {
    const query = createCrmWhatsappSessionCountsQuery({
      connectionId: "connection_1",
      filter: "mine",
      humanAttendanceState: "IN_HUMAN_SERVICE",
      search: "maria",
      status: "HUMAN_TAKEOVER",
      tagIds: ["tag-1", "tag-2"],
      unreadOnly: true,
    }).toString();

    expect(query).toBe(
      "connectionId=connection_1&filter=mine&humanAttendanceState=IN_HUMAN_SERVICE&search=maria&status=HUMAN_TAKEOVER&tagIds=tag-1%2Ctag-2&unreadOnly=true",
    );
    expect(query).not.toContain("attendanceState=");
  });
});
