import { describe, expect, it } from "vitest";
import type { SessionBootstrap } from "../account/apiClient";
import type { RoleManagementView } from "../settings/types";
import {
  canAssignWhatsappSessions,
  mapRoleManagementToWhatsappAssignableMembers,
} from "./useCrmWhatsappAssignableMembers";

describe("useCrmWhatsappAssignableMembers", () => {
  it("maps active WhatsApp-capable members to assignable members", () => {
    const assignableMembers = mapRoleManagementToWhatsappAssignableMembers(
      createRoles(),
      createSession(),
    );

    expect(assignableMembers).toEqual([
      expect.objectContaining({
        email: "owner@loja.local",
        id: "user_owner",
        name: "Owner",
        role: "OWNER",
        seeUnassignedChats: true,
      }),
      expect.objectContaining({
        email: "sales@loja.local",
        id: "user_sales",
        name: "Sales",
        role: "SALESMAN",
      }),
    ]);
  });

  it("reads assign capability from the current store permissions", () => {
    expect(canAssignWhatsappSessions(createSession())).toBe(true);
    expect(
      canAssignWhatsappSessions({
        ...createSession(),
        defaultStore: {
          ...createSession().defaultStore!,
          effectivePermissions: ["crm.whatsapp.read"],
        },
      }),
    ).toBe(false);
  });
});

function createSession(): SessionBootstrap {
  return {
    defaultStore: {
      effectivePermissions: ["crm.whatsapp.assign", "crm.whatsapp.read"],
      role: "owner",
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
      clerkUserId: "clerk_owner",
      email: "owner@loja.local",
      id: "user_owner",
      name: "Owner",
    },
  };
}

function createRoles(): RoleManagementView {
  return {
    actor: {
      canManageRoles: true,
      membershipId: "membership_1",
      role: "owner",
    },
    memberships: [
      createMember("user_owner", "Owner", "owner", [
        "crm.whatsapp.assign",
        "crm.whatsapp.read",
      ]),
      createMember("user_sales", "Sales", "salesman", ["crm.whatsapp.read"]),
      createMember("user_billing", "Billing", "investor", ["billing.view"]),
    ],
    pendingInvitations: [],
    permissionGroups: [],
    roles: [],
  };
}

function createMember(
  id: string,
  name: string,
  role: RoleManagementView["memberships"][number]["role"],
  permissions: readonly string[],
): RoleManagementView["memberships"][number] {
  return {
    basePermissions: permissions,
    effectivePermissions: permissions,
    manageable: true,
    membershipId: `membership_${id}`,
    overrides: [],
    role,
    status: "active",
    user: {
      email: `${name.toLowerCase()}@loja.local`,
      id,
      name,
    },
  };
}
