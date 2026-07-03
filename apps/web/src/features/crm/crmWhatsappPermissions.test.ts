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
      canList: true,
      canRead: true,
      canSend: false,
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
          "crm.whatsapp.send",
          "crm.whatsapp.toggle_intervention",
        ]),
      ),
    ).toEqual({
      canAssign: true,
      canClose: true,
      canList: true,
      canRead: true,
      canSend: true,
      canToggleIntervention: true,
    });
  });

  it("keeps assignable agent discovery tied to WhatsApp queue access", () => {
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
