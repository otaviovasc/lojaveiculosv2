// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RoleKey, RoleManagementView, RoleMemberView } from "../types";
import { MembrosSidebar } from "./MembrosSidebar";

afterEach(cleanup);

describe("MembrosSidebar", () => {
  it("renders pending invitations below active members", () => {
    const roles = createRoleManagement();

    render(
      <MembrosSidebar
        canInvite
        customRoles={[]}
        memberPresetMapping={{}}
        onInviteClick={vi.fn()}
        onSendInvitation={vi.fn()}
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
    expect(screen.getByText("Reenviar convite")).toBeInTheDocument();
  });

  it("offers the acceptance link after Clerk accepts a resend request", async () => {
    const roles = createRoleManagement();
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const onSendInvitation = vi.fn(async () => ({
      acceptUrl: "https://example.accounts.dev/invitation_1",
      email: "novo@lojaveiculos.com.br",
      emailDeliveryStatus: "requested" as const,
      id: "invitation_1",
      role: "salesman" as const,
      status: "sent" as const,
      storeId: "store_1",
      tenantId: "tenant_1",
    }));

    render(
      <MembrosSidebar
        canInvite
        customRoles={[]}
        memberPresetMapping={{}}
        onInviteClick={vi.fn()}
        onSendInvitation={onSendInvitation}
        onSelectId={vi.fn()}
        roleLabel={roleLabel}
        roles={roles}
        selected={roles.memberships[0] as RoleMemberView}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reenviar convite" }));

    expect(
      await screen.findByText("Envio solicitado ao Clerk."),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Copiar link de acesso" }),
    );
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        "https://example.accounts.dev/invitation_1",
      ),
    );
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
