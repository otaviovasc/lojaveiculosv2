import { describe, expect, it } from "vitest";
import type { SessionBootstrap } from "../account/apiClient";
import {
  hasWhatsappQueueAccess,
  readCrmWhatsappCapabilities,
} from "./crmWhatsappPermissions";

describe("CRM WhatsApp permissions", () => {
  it("maps read-only store users to list/read capabilities only", () => {
    expect(
      readCrmWhatsappCapabilities(
        createSession(["crm.whatsapp.list", "crm.whatsapp.read"]),
      ),
    ).toEqual({
      canAssign: false,
      canClose: false,
      canConnectionManage: false,
      canList: true,
      canRead: true,
      canScheduleCancel: false,
      canScheduleCreate: false,
      canScheduleProcess: false,
      canScheduleRead: false,
      canSend: false,
      canTagAssign: false,
      canTagManage: false,
      canToggleIntervention: false,
    });
  });

  it("maps operator store users to all WhatsApp queue actions", () => {
    expect(
      readCrmWhatsappCapabilities(
        createSession([
          "crm.whatsapp.assign",
          "crm.whatsapp.close",
          "crm.whatsapp.list",
          "crm.whatsapp.read",
          "crm.whatsapp.schedules.cancel",
          "crm.whatsapp.schedules.create",
          "crm.whatsapp.schedules.read",
          "crm.whatsapp.send",
          "crm.whatsapp.tags.assign",
          "crm.whatsapp.toggle_intervention",
        ]),
      ),
    ).toEqual({
      canAssign: true,
      canClose: true,
      canConnectionManage: false,
      canList: true,
      canRead: true,
      canScheduleCancel: true,
      canScheduleCreate: true,
      canScheduleProcess: false,
      canScheduleRead: true,
      canSend: true,
      canTagAssign: true,
      canTagManage: false,
      canToggleIntervention: true,
    });
  });

  it("uses one V2 manage key for connection administration", () => {
    expect(
      readCrmWhatsappCapabilities(
        createSession(["crm.whatsapp.connection.manage"]),
      ).canConnectionManage,
    ).toBe(true);
  });

  it("keeps assignable member discovery tied to WhatsApp queue access", () => {
    expect(hasWhatsappQueueAccess(["crm.whatsapp.read"])).toBe(true);
    expect(hasWhatsappQueueAccess(["crm.whatsapp.list"])).toBe(true);
    expect(hasWhatsappQueueAccess(["lead.read"])).toBe(false);
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
