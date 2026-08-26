// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import type { SessionBootstrap } from "../account/apiClient";
import { persistCurrentStoreSlug } from "../account/currentStore";
import type { RoleManagementView } from "../settings/types";
import {
  canAssignConversationCycles,
  mapRoleManagementToCrmAssignableMembers,
} from "./useCrmAssignableMembers";

describe("useCrmAssignableMembers", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("maps active WhatsApp-capable members to assignable members", () => {
    const assignableMembers = mapRoleManagementToCrmAssignableMembers(
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
    expect(canAssignConversationCycles(createSession())).toBe(true);
    expect(
      canAssignConversationCycles({
        ...createSession(),
        defaultStore: {
          ...createSession().defaultStore!,
          effectivePermissions: ["crm.conversations.read"],
        },
      }),
    ).toBe(false);
  });

  it("reads assign capability from an agency-selected store", () => {
    const session = createSession();
    session.defaultStore = null;
    session.stores = [
      {
        ...createSession().defaultStore!,
        effectivePermissions: ["crm.conversations.assign"],
        role: "agency",
        storeName: "Loja da agência",
        storeSlug: "agency-store",
      },
    ];
    persistCurrentStoreSlug("agency-store", session.user.clerkUserId);

    expect(canAssignConversationCycles(session)).toBe(true);
    expect(
      mapRoleManagementToCrmAssignableMembers(
        { ...createRoles(), memberships: [] },
        session,
      ),
    ).toEqual([
      expect.objectContaining({
        id: "user_owner",
        role: "AGENCY",
        seeUnassignedChats: true,
      }),
    ]);
  });
});

function createSession(): SessionBootstrap {
  return {
    defaultStore: {
      effectivePermissions: [
        "crm.conversations.assign",
        "crm.conversations.read",
      ],
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
        "crm.conversations.assign",
        "crm.conversations.read",
      ]),
      createMember("user_sales", "Sales", "salesman", [
        "crm.conversations.read",
      ]),
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
