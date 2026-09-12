import type {
  StoreId,
  StoreMembershipId,
  TenantId,
  UserId,
} from "@lojaveiculosv2/shared";
import { vi } from "vitest";
import { createServiceContext } from "../../shared/serviceContext.js";
import type { RoleManagementRepository } from "./ports/roleManagementRepository.js";

export const roleTestStoreId = "store_1" as StoreId;
export const roleTestTenantId = "tenant_1" as TenantId;
export const roleTestOwnerUserId = "user_owner" as UserId;
export const roleTestAgencyUserId = "user_agency" as UserId;
export const roleTestOwnerMembershipId =
  "membership_owner" as StoreMembershipId;
export const roleTestSalesmanMembershipId =
  "membership_salesman" as StoreMembershipId;

export function createRoleTestContext(userId: UserId) {
  return createServiceContext({
    actor: { id: userId, kind: "user" },
    permissions: ["users.manage"],
    request: { requestId: "req_1" },
    storeId: roleTestStoreId,
    tenantId: roleTestTenantId,
  });
}

export function createRoleTestRepository(): RoleManagementRepository {
  const state = {
    memberships: [
      {
        membershipId: "membership_agency" as StoreMembershipId,
        overrides: [],
        role: "agency" as const,
        status: "active" as const,
        user: {
          email: "agency@test",
          id: roleTestAgencyUserId,
          name: "Agency",
        },
      },
      {
        membershipId: roleTestOwnerMembershipId,
        overrides: [],
        role: "owner" as const,
        status: "active" as const,
        user: {
          email: "owner@test",
          id: roleTestOwnerUserId,
          name: "Owner",
        },
      },
      {
        membershipId: roleTestSalesmanMembershipId,
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
    pendingInvitations: [],
    storeId: roleTestStoreId,
    tenantId: roleTestTenantId,
  };

  return {
    listActiveMembersByStore: vi.fn(async () => []),
    listByStore: vi.fn(async () => state),
    updateMembershipAccess: vi.fn(async () => state),
  };
}
