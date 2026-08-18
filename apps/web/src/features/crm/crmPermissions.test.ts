import { describe, expect, it } from "vitest";
import type { SessionBootstrap } from "../account/apiClient";
import {
  hasCrmConversationAccess,
  readCrmCapabilities,
} from "./crmPermissions";

describe("CRM WhatsApp permissions", () => {
  it("maps read-only store users to list/read capabilities only", () => {
    expect(
      readCrmCapabilities(
        createSession(["crm.conversations.read", "crm.conversations.read"]),
      ),
    ).toEqual({
      canAssign: false,
      canCampaignManage: false,
      canCampaignRead: false,
      canClose: false,
      canConnectionPair: false,
      canConnectionSetup: false,
      canIntegrationsManage: false,
      canList: true,
      canRead: true,
      canRoutingDefaultManage: false,
      canScheduleCancel: false,
      canScheduleCreate: false,
      canScheduleProcess: false,
      canScheduleRead: false,
      canSend: false,
      canTagAssign: false,
      canTagManage: false,
      canToggleIntervention: false,
      canVisitsManage: false,
      canVisitsRead: false,
    });
  });

  it("maps operator store users to all WhatsApp queue actions", () => {
    expect(
      readCrmCapabilities(
        createSession([
          "crm.conversations.assign",
          "crm.conversations.manage",
          "crm.conversations.read",
          "crm.conversations.read",
          "crm.scheduled_messages.cancel",
          "crm.scheduled_messages.create",
          "crm.scheduled_messages.read",
          "crm.messages.send",
          "crm.tags.assign",
          "crm.attendances.manage",
        ]),
      ),
    ).toMatchObject({
      canAssign: true,
      canClose: true,
      canScheduleCancel: true,
      canScheduleCreate: true,
      canScheduleRead: true,
      canSend: true,
      canTagAssign: true,
      canToggleIntervention: true,
    });
  });

  it("maps setup and pairing permissions independently", () => {
    expect(
      readCrmCapabilities(
        createSession([
          "crm.messaging.connection.pair",
          "crm.messaging.connection.setup",
        ]),
      ),
    ).toMatchObject({
      canConnectionPair: true,
      canConnectionSetup: true,
    });

    expect(
      readCrmCapabilities(createSession(["crm.messaging.connection.setup"])),
    ).toMatchObject({
      canConnectionPair: false,
      canConnectionSetup: true,
    });

    expect(
      readCrmCapabilities(createSession(["crm.messaging.connection.pair"])),
    ).toMatchObject({
      canConnectionPair: true,
      canConnectionSetup: false,
    });
  });

  it("maps default routing independently from connection setup", () => {
    expect(
      readCrmCapabilities(createSession(["crm.routing.default.manage"])),
    ).toMatchObject({
      canConnectionSetup: false,
      canRoutingDefaultManage: true,
    });
  });

  it("maps visit permissions independently from WhatsApp queue actions", () => {
    expect(
      readCrmCapabilities(
        createSession(["crm.visits.manage", "crm.visits.read"]),
      ),
    ).toMatchObject({
      canVisitsManage: true,
      canVisitsRead: true,
    });
  });

  it("maps the integrations manage permission independently", () => {
    expect(
      readCrmCapabilities(createSession(["crm.bot.manage"])),
    ).toMatchObject({
      canIntegrationsManage: true,
    });
  });

  it("keeps assignable member discovery tied to WhatsApp queue access", () => {
    expect(hasCrmConversationAccess(["crm.conversations.read"])).toBe(true);
    expect(hasCrmConversationAccess(["crm.conversations.read"])).toBe(true);
    expect(hasCrmConversationAccess(["lead.read"])).toBe(false);
  });
});

function createSession(permissions: readonly string[]): SessionBootstrap {
  return {
    defaultStore: {
      effectivePermissions: permissions,
      role: "salesman",
      status: "active",
      storeId: "store_1",
      storeName: "Loja",
      storeSlug: "test-store",
      tenantId: "tenant_1",
      tenantName: "Tenant",
    },
    needsOnboarding: false,
    platformAdmin: false,
    stores: [],
    tenantMemberships: [],
    user: {
      clerkUserId: "clerk_user",
      email: "user@loja.local",
      id: "user_1",
      name: "User",
    },
  };
}
