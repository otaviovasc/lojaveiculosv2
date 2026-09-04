import { describe, expect, it } from "vitest";
import {
  createRoleTestContext as createContext,
  createRoleTestRepository as createRepository,
  roleTestOwnerUserId as ownerUserId,
  roleTestSalesmanMembershipId as salesmanMembershipId,
} from "../../testSupportRoleManagement.js";
import { updateMembershipAccess } from "./updateMembershipAccess.js";

describe("updateMembershipAccess security boundaries", () => {
  it("rejects platform support authority as a store permission override", async () => {
    await expect(
      updateMembershipAccess(
        createContext(ownerUserId),
        {
          membershipId: salesmanMembershipId,
          overrides: [
            {
              allowed: true,
              permission: "crm.messaging.support.manage",
              reason: "store_override_attempt",
            },
          ],
          role: "supervisor",
        },
        { roleManagementRepository: createRepository() },
      ),
    ).rejects.toThrow(
      "Unknown permission override: crm.messaging.support.manage",
    );
  });
});
