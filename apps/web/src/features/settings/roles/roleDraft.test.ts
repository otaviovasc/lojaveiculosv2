import { describe, expect, it } from "vitest";
import { createDraft, createOverrides, summarizeDraft } from "./roleDraft";
import type { RoleManagementView, RoleMemberView } from "../types";

describe("role draft helpers", () => {
  it("preserves tri-state overrides for the permission PATCH contract", () => {
    const draft = createDraft(
      createMember({
        overrides: [
          {
            allowed: true,
            permission: "inventory.update_price",
            reason: "approved",
          },
          { allowed: false, permission: "crm.manage", reason: null },
        ],
      }),
    );

    expect(createOverrides(draft)).toEqual([
      {
        allowed: true,
        permission: "inventory.update_price",
        reason: "role_management_tri_state",
      },
      {
        allowed: false,
        permission: "crm.manage",
        reason: "role_management_tri_state",
      },
    ]);
  });

  it("summarizes effective inherited and manual permissions", () => {
    const roles = createRoleManagement();
    const draft = createDraft(
      createMember({
        overrides: [
          { allowed: true, permission: "inventory.update_price", reason: null },
          { allowed: false, permission: "lead.read", reason: null },
        ],
      }),
    );

    expect(summarizeDraft(draft, roles)).toEqual({
      active: 2,
      allowed: 1,
      denied: 1,
    });
  });
});

function createRoleManagement(): RoleManagementView {
  return {
    actor: {
      canManageRoles: true,
      membershipId: "member_owner",
      role: "owner",
    },
    memberships: [],
    pendingInvitations: [],
    permissionGroups: [
      {
        key: "operations",
        label: "Operacao",
        permissions: [
          {
            description: "Ver estoque.",
            key: "inventory.read",
            label: "Estoque",
            risk: "low",
          },
          {
            description: "Editar preco.",
            key: "inventory.update_price",
            label: "Preco",
            risk: "high",
          },
          {
            description: "Ver leads.",
            key: "lead.read",
            label: "Leads",
            risk: "low",
          },
        ],
      },
    ],
    roles: [
      {
        assignable: true,
        defaultPermissions: ["inventory.read", "lead.read"],
        description: "Vendedor.",
        label: "Vendedor",
        level: 40,
        role: "salesman",
      },
    ],
  };
}

function createMember(input: Partial<RoleMemberView> = {}): RoleMemberView {
  return {
    basePermissions: ["inventory.read", "lead.read"],
    effectivePermissions: ["inventory.read", "lead.read"],
    manageable: true,
    membershipId: "member_sales",
    overrides: [],
    role: "salesman",
    status: "active",
    user: {
      email: "vendedor@example.com",
      id: "user_sales",
      name: "Vendedor",
    },
    ...input,
  };
}
