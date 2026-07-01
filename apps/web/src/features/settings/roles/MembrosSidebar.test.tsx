// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RoleKey, RoleManagementView, RoleMemberView } from "../types";
import { MembrosSidebar } from "./MembrosSidebar";

describe("MembrosSidebar", () => {
  it("renders pending invitations below active members", () => {
    const roles = createRoleManagement();

    render(
      <MembrosSidebar
        canInvite
        customRoles={[]}
        memberPresetMapping={{}}
        onInviteClick={vi.fn()}
        onSelectId={vi.fn()}
        roleLabel={roleLabel}
        roles={roles}
        selected={roles.memberships[0] as RoleMemberView}
      />,
    );

    expect(screen.getByText("Convites pendentes")).toBeInTheDocument();
    expect(screen.getByText("Novo Vendedor")).toBeInTheDocument();
    expect(screen.getByText("novo@lojaveiculos.com.br")).toBeInTheDocument();
    expect(screen.getByText("Pendente")).toBeInTheDocument();
  });
});

function createRoleManagement(): RoleManagementView {
  return {
    actor: {
      canManageRoles: true,
      membershipId: "member_owner",
      role: "owner",
    },
    memberships: [
      createMember({
        membershipId: "member_owner",
        role: "owner",
        user: {
          email: "owner@lojaveiculos.com.br",
          id: "user_owner",
          name: "Owner",
        },
      }),
    ],
    pendingInvitations: [
      {
        email: "novo@lojaveiculos.com.br",
        id: "invitation_1",
        name: "Novo Vendedor",
        role: "salesman",
        status: "sent",
        storeId: "store_1",
        tenantId: "tenant_1",
      },
    ],
    permissionGroups: [],
    roles: [
      {
        assignable: true,
        defaultPermissions: [],
        description: "Dono.",
        label: "Proprietario",
        level: 80,
        role: "owner",
      },
      {
        assignable: true,
        defaultPermissions: [],
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
    basePermissions: [],
    effectivePermissions: [],
    manageable: false,
    membershipId: "member_owner",
    overrides: [],
    role: "owner",
    status: "active",
    user: {
      email: "owner@lojaveiculos.com.br",
      id: "user_owner",
      name: "Owner",
    },
    ...input,
  };
}

function roleLabel(role: RoleKey, roles: RoleManagementView) {
  return roles.roles.find((item) => item.role === role)?.label ?? role;
}
