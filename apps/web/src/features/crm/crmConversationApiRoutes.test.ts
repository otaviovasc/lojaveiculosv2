import { describe, expect, it } from "vitest";
import {
  createCrmConversationCyclesQuery,
  crmConversationRoutes,
} from "./crmConversationApi";
import { createCrmConversationCycleCountsQuery } from "./crmConversationApiRoutes";

describe("CRM conversation API routes", () => {
  it("builds canonical channel-neutral routes", () => {
    expect(crmConversationRoutes.connections()).toBe(
      "/api/v1/crm/channel-connections",
    );
    expect(crmConversationRoutes.connection("connection-1")).toBe(
      "/api/v1/crm/channel-connections/connection-1",
    );
    expect(crmConversationRoutes.conversationsStart()).toBe(
      "/api/v1/crm/conversation-cycles/start",
    );
    expect(crmConversationRoutes.conversationCycles()).toBe(
      "/api/v1/crm/conversation-cycles",
    );
    expect(crmConversationRoutes.conversationCycleCounts()).toBe(
      "/api/v1/crm/conversation-cycles/counts",
    );
    expect(crmConversationRoutes.messages("cycle-uuid")).toBe(
      "/api/v1/crm/conversation-cycles/cycle-uuid/messages",
    );
    expect(crmConversationRoutes.message("message-uuid")).toBe(
      "/api/v1/crm/messages/message-uuid",
    );
    expect(crmConversationRoutes.messageReaction("message-uuid")).toBe(
      "/api/v1/crm/messages/message-uuid/reaction",
    );
    expect(crmConversationRoutes.assignCycle("cycle-uuid")).toBe(
      "/api/v1/crm/conversation-cycles/cycle-uuid/actions/assign",
    );
    expect(crmConversationRoutes.closeCycle("cycle-uuid")).toBe(
      "/api/v1/crm/conversation-cycles/cycle-uuid/actions/close",
    );
    expect(crmConversationRoutes.updateCycleAttendance("cycle-uuid")).toBe(
      "/api/v1/crm/conversation-cycles/cycle-uuid/attendance",
    );
    expect(crmConversationRoutes.markCycleRead("cycle-uuid")).toBe(
      "/api/v1/crm/conversation-cycles/cycle-uuid/actions/read",
    );
    expect(crmConversationRoutes.markCycleUnread("cycle-uuid")).toBe(
      "/api/v1/crm/conversation-cycles/cycle-uuid/actions/unread",
    );
    expect(crmConversationRoutes.concludeCycle("cycle-uuid")).toBe(
      "/api/v1/crm/conversation-cycles/cycle-uuid/actions/conclusion",
    );
    expect(crmConversationRoutes.quickMessages()).toBe(
      "/api/v1/crm/quick-messages",
    );
    expect(crmConversationRoutes.botIntegration()).toBe(
      "/api/v1/crm/bot/configuration",
    );
    expect(crmConversationRoutes.routingPolicy()).toBe(
      "/api/v1/crm/routing-policy",
    );
    expect(crmConversationRoutes.olxChatSetupRetry("connection-1")).toBe(
      "/api/v1/crm/channel-connections/connection-1/olx-chat/setup/retry",
    );
    expect(crmConversationRoutes.composioAuthorize("connection-1")).toBe(
      "/api/v1/crm/channel-connections/connection-1/composio/authorize",
    );
    expect(crmConversationRoutes.composioComplete("connection-1")).toBe(
      "/api/v1/crm/channel-connections/connection-1/composio/complete",
    );
    expect(crmConversationRoutes.composioSender("connection-1")).toBe(
      "/api/v1/crm/channel-connections/connection-1/composio/sender",
    );
    expect(crmConversationRoutes.zapiDisconnect("connection-1")).toBe(
      "/api/v1/crm/channel-connections/connection-1/zapi/disconnect",
    );
    expect(crmConversationRoutes.zapiPairingCode("connection-1")).toBe(
      "/api/v1/crm/channel-connections/connection-1/zapi/pairing/code",
    );
    expect(crmConversationRoutes.zapiPairingQr("connection-1")).toBe(
      "/api/v1/crm/channel-connections/connection-1/zapi/pairing/qr",
    );
    expect(crmConversationRoutes.zapiStatusRefresh("connection-1")).toBe(
      "/api/v1/crm/channel-connections/connection-1/zapi/status/refresh",
    );
    expect(crmConversationRoutes.zapiWebhooksConfigure("connection-1")).toBe(
      "/api/v1/crm/channel-connections/connection-1/zapi/webhooks/configure",
    );
    expect(crmConversationRoutes.quickMessage("quick_1")).toBe(
      "/api/v1/crm/quick-messages/quick_1",
    );
    expect(crmConversationRoutes.providerEventIssues()).toBe(
      "/api/v1/crm/provider-events",
    );
    expect(crmConversationRoutes.retryProviderEvent("event_1")).toBe(
      "/api/v1/crm/provider-events/event_1/retry",
    );
    expect(crmConversationRoutes.cycleTags("cycle-uuid")).toBe(
      "/api/v1/crm/conversation-cycles/cycle-uuid/tags",
    );
    expect(crmConversationRoutes.cycleTag("cycle-uuid", "tag-uuid")).toBe(
      "/api/v1/crm/conversation-cycles/cycle-uuid/tags/tag-uuid",
    );
    expect(crmConversationRoutes.sendCatalog()).toBe(
      "/api/v1/crm/whatsapp/send/catalog",
    );
    expect(crmConversationRoutes.sendLocation()).toBe(
      "/api/v1/crm/whatsapp/send/location",
    );
    expect(crmConversationRoutes.sendText()).toBe("/api/v1/crm/messages/text");
    expect(crmConversationRoutes.sendMedia("cycle-uuid")).toBe(
      "/api/v1/crm/conversation-cycles/cycle-uuid/messages/media",
    );
    expect(crmConversationRoutes.sendQuickMessage("quick_1")).toBe(
      "/api/v1/crm/quick-messages/quick_1/send",
    );
    expect(crmConversationRoutes.sendVehicle()).toBe(
      "/api/v1/crm/whatsapp/send/vehicle",
    );
  });

  it("serializes inbox cycle queries", () => {
    expect(
      createCrmConversationCyclesQuery({
        assigneeId: "03030303-0303-4303-8303-030303030303",
        connectionId: "connection_1",
        filter: "fresh",
        humanAttendanceState: "WAITING_HUMAN",
        limit: 40,
        offset: 80,
        search: "maria",
        cycleId: "session_1",
        status: "ACTIVE",
        tagIds: [
          "550e8400-e29b-41d4-a716-446655440000",
          "550e8400-e29b-41d4-a716-446655440001",
        ],
        unreadOnly: true,
      }).toString(),
    ).toBe(
      "assigneeId=03030303-0303-4303-8303-030303030303&connectionId=connection_1&filter=fresh&humanAttendanceState=WAITING_HUMAN&limit=40&offset=80&search=maria&cycleId=session_1&status=ACTIVE&tagIds=550e8400-e29b-41d4-a716-446655440000%2C550e8400-e29b-41d4-a716-446655440001&unreadOnly=true",
    );
  });

  it("serializes only the V2 attendance field in count queries", () => {
    const query = createCrmConversationCycleCountsQuery({
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
