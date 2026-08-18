import { describe, expect, it } from "vitest";
import type { UserId } from "@lojaveiculosv2/shared";
import {
  createRoleTestContext as createContext,
  createRoleTestRepository as createRepository,
  roleTestAgencyUserId as agencyUserId,
  roleTestOwnerMembershipId as ownerMembershipId,
  roleTestOwnerUserId as ownerUserId,
  roleTestSalesmanMembershipId as salesmanMembershipId,
} from "../../testSupportRoleManagement.js";
import { updateMembershipAccess } from "./updateMembershipAccess.js";
import { RoleManagementPolicyError } from "./serviceSupport.js";

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
            permission: "crm.messages.send",
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
            permission: "crm.messages.send",
            reason: "approved",
          },
        ],
      }),
    );
    expect(
      result.permissionGroups
        .find((group) => group.key === "crm")
        ?.permissions.map((permission) => permission.key),
    ).toEqual(expect.arrayContaining(["crm.messages.send"]));
  });

  it("keeps CRM setup allowed while persisting an explicit pairing denial", async () => {
    const repository = createRepository();

    await updateMembershipAccess(
      createContext(ownerUserId),
      {
        membershipId: salesmanMembershipId,
        overrides: [
          {
            allowed: true,
            permission: "crm.messaging.connection.setup",
            reason: "channel_configuration_allowed",
          },
          {
            allowed: false,
            permission: "crm.messaging.connection.pair",
            reason: "pairing_requires_owner",
          },
        ],
        role: "supervisor",
      },
      { roleManagementRepository: repository },
    );

    expect(repository.updateMembershipAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        overrides: [
          {
            allowed: false,
            permission: "crm.messaging.connection.pair",
            reason: "pairing_requires_owner",
          },
        ],
        role: "supervisor",
      }),
    );
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
