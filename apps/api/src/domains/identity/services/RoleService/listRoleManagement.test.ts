import { describe, expect, it, vi } from "vitest";
import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import { AuthorizationError } from "../../../../shared/authorization.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { RoleManagementRepository } from "../../ports/roleManagementRepository.js";
import { listRoleManagement } from "./listRoleManagement.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const ownerUserId = "user_owner" as UserId;

describe("listRoleManagement", () => {
  it("includes active store invitations for the members sidebar", async () => {
    const repository = createRepository();

    const result = await listRoleManagement(createContext(), {
      roleManagementRepository: repository,
    });

    expect(result.pendingInvitations).toEqual([
      {
        email: "novo@lojaveiculos.com.br",
        id: "invitation_1",
        name: "Novo Vendedor",
        role: "salesman",
        status: "sent",
        storeId,
        tenantId,
      },
    ]);
  });

  it("rejects tenant-level agency access without a store membership", async () => {
    const repository = createRepository();
    const context = createServiceContext({
      actor: { id: "user_agency", kind: "user" },
      permissions: ["users.manage"],
      request: { requestId: "req_1" },
      storeId,
      tenantId,
    });

    await expect(
      listRoleManagement(context, {
        roleManagementRepository: repository,
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

function createContext() {
  return createServiceContext({
    actor: { id: ownerUserId, kind: "user" },
    permissions: ["users.manage"],
    request: { requestId: "req_1" },
    storeId,
    tenantId,
  });
}

function createRepository(): RoleManagementRepository {
  return {
    listActiveMembersByStore: vi.fn(async () => []),
    listByStore: vi.fn(async () => ({
      memberships: [
        {
          membershipId: "membership_owner" as never,
          overrides: [],
          role: "owner" as const,
          status: "active" as const,
          user: {
            email: "owner@lojaveiculos.com.br",
            id: ownerUserId,
            name: "Owner",
          },
        },
      ],
      pendingInvitations: [
        {
          email: "novo@lojaveiculos.com.br",
          id: "invitation_1",
          name: "Novo Vendedor",
          role: "salesman" as const,
          status: "sent" as const,
          storeId,
          tenantId,
        },
      ],
      storeId,
      tenantId,
    })),
    updateMembershipAccess: vi.fn(),
  };
}
