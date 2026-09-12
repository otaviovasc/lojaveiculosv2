// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RoleManagementView } from "../../settings/types";
import { AgencyTeamAccessEmptyRosterState } from "./AgencyTeamAccessParts";

describe("AgencyTeamAccessEmptyRosterState", () => {
  afterEach(cleanup);

  it("offers the first invitation only to actors with an assignable role", () => {
    const onInvite = vi.fn();
    const onResendInvitation = vi.fn();
    const { rerender } = render(
      <AgencyTeamAccessEmptyRosterState
        onInvite={onInvite}
        onResendInvitation={onResendInvitation}
        roles={emptyRoles(true)}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Convidar primeiro membro" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Convidar novo membro" }),
    ).toBeInTheDocument();

    rerender(
      <AgencyTeamAccessEmptyRosterState
        onInvite={onInvite}
        onResendInvitation={onResendInvitation}
        roles={emptyRoles(false)}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Convidar primeiro membro" }),
    ).not.toBeInTheDocument();
  });
});

function emptyRoles(canManageRoles: boolean): RoleManagementView {
  return {
    actor: { canManageRoles, membershipId: null, role: "agency" },
    memberships: [],
    pendingInvitations: [],
    permissionGroups: [],
    roles: [
      {
        assignable: true,
        defaultPermissions: [],
        description: "Vendedor de veículos",
        label: "Vendedor",
        level: 40,
        role: "salesman",
      },
    ],
  };
}
