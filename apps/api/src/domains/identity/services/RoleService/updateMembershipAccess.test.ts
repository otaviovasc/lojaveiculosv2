import { describe, expect, it, vi } from "vitest";
import type {
  StoreId,
  StoreMembershipId,
  TenantId,
  UserId,
} from "@lojaveiculosv2/shared";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { RoleManagementRepository } from "../../ports/roleManagementRepository.js";
import { updateMembershipAccess } from "./updateMembershipAccess.js";
import { RoleManagementPolicyError } from "./serviceSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const ownerUserId = "user_owner" as UserId;
const agencyUserId = "user_agency" as UserId;
const ownerMembershipId = "membership_owner" as StoreMembershipId;
const agencyMembershipId = "membership_agency" as StoreMembershipId;
const salesmanMembershipId = "membership_salesman" as StoreMembershipId;

describe("updateMembershipAccess", () => {
  it("lets owner update subuser role and overrides", async () => {
    const repository = createRepository();
    const result = await updateMembershipAccess(
      createContext(ownerUserId),
      {
        membershipId: salesmanMembershipId,
        overrides: [
          { allowed: true, permission: "inventory.update_price", reason: null },
        ],
        role: "supervisor",
      },
      { roleManagementRepository: repository },
    );

    expect(repository.updateMembershipAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        membershipId: salesmanMembershipId,
        role: "supervisor",
      }),
    );
    expect(result.actor.canManageRoles).toBe(true);
  });

  it("lets owner assign investor read-only role", async () => {
    const repository = createRepository();

    await updateMembershipAccess(
      createContext(ownerUserId),
      { membershipId: salesmanMembershipId, overrides: [], role: "investor" },
      { roleManagementRepository: repository },
    );

    expect(repository.updateMembershipAccess).toHaveBeenCalledWith(
      expect.objectContaining({ role: "investor" }),
    );
  });

  it("exposes and accepts explicit WhatsApp permission overrides", async () => {
    const repository = createRepository();
    const result = await updateMembershipAccess(
      createContext(ownerUserId),
      {
        membershipId: salesmanMembershipId,
        overrides: [
          {
            allowed: true,
            permission: "crm.whatsapp.send",
            reason: "approved",
          },
        ],
        role: "investor",
      },
      { roleManagementRepository: repository },
    );

    expect(repository.updateMembershipAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        overrides: [
          {
            allowed: true,
            permission: "crm.whatsapp.send",
            reason: "approved",
          },
        ],
      }),
    );
    expect(
      result.permissionGroups
        .find((group) => group.key === "crm")
        ?.permissions.map((permission) => permission.key),
    ).toEqual(expect.arrayContaining(["crm.whatsapp.send"]));
  });

  it("blocks owner from assigning owner role", async () => {
    await expect(
      updateMembershipAccess(
        createContext(ownerUserId),
        { membershipId: salesmanMembershipId, overrides: [], role: "owner" },
        { roleManagementRepository: createRepository() },
      ),
    ).rejects.toBeInstanceOf(RoleManagementPolicyError);
  });

  it("rejects unknown permission overrides", async () => {
    await expect(
      updateMembershipAccess(
        createContext(ownerUserId),
        {
          membershipId: salesmanMembershipId,
          overrides: [
            {
              allowed: true,
              permission: "inventory.fly" as never,
              reason: null,
            },
          ],
          role: "supervisor",
        },
        { roleManagementRepository: createRepository() },
      ),
    ).rejects.toThrow("Unknown permission override");
  });

  it("rejects duplicate permission overrides", async () => {
    await expect(
      updateMembershipAccess(
        createContext(ownerUserId),
        {
          membershipId: salesmanMembershipId,
          overrides: [
            {
              allowed: true,
              permission: "inventory.update_price",
              reason: null,
            },
            {
              allowed: false,
              permission: "inventory.update_price",
              reason: null,
            },
          ],
          role: "supervisor",
        },
        { roleManagementRepository: createRepository() },
      ),
    ).rejects.toThrow("Duplicate permission override");
  });

  it("lets agency manage store owners", async () => {
    const repository = createRepository();

    await updateMembershipAccess(
      createContext(agencyUserId),
      { membershipId: ownerMembershipId, overrides: [], role: "owner" },
      { roleManagementRepository: repository },
    );

    expect(repository.updateMembershipAccess).toHaveBeenCalledWith(
      expect.objectContaining({ membershipId: ownerMembershipId }),
    );
  });

  it("blocks users from editing their own role", async () => {
    await expect(
      updateMembershipAccess(
        createContext(ownerUserId),
        { membershipId: ownerMembershipId, overrides: [], role: "supervisor" },
        { roleManagementRepository: createRepository() },
      ),
    ).rejects.toBeInstanceOf(RoleManagementPolicyError);
  });

  it("blocks salesman role management", async () => {
    await expect(
      updateMembershipAccess(
        createContext("user_salesman" as UserId),
        {
          membershipId: salesmanMembershipId,
          overrides: [],
          role: "supervisor",
        },
        { roleManagementRepository: createRepository() },
      ),
    ).rejects.toBeInstanceOf(RoleManagementPolicyError);
  });
});

function createContext(userId: UserId) {
  return createServiceContext({
    actor: { id: userId, kind: "user" },
    permissions: ["users.manage"],
    request: { requestId: "req_1" },
    storeId,
    tenantId,
  });
}

function createRepository(): RoleManagementRepository {
  const state = {
    memberships: [
      {
        membershipId: agencyMembershipId,
        overrides: [],
        role: "agency" as const,
        status: "active" as const,
        user: { email: "agency@test", id: agencyUserId, name: "Agency" },
      },
      {
        membershipId: ownerMembershipId,
        overrides: [],
        role: "owner" as const,
        status: "active" as const,
        user: { email: "owner@test", id: ownerUserId, name: "Owner" },
      },
      {
        membershipId: salesmanMembershipId,
        overrides: [],
        role: "salesman" as const,
        status: "active" as const,
        user: {
          email: "salesman@test",
          id: "user_salesman" as UserId,
          name: "Salesman",
        },
      },
    ],
    storeId,
    tenantId,
  };

  return {
    listByStore: vi.fn(async () => state),
    updateMembershipAccess: vi.fn(async () => state),
  };
}
