import type {
  RoleManagementRepository,
  RoleManagementState,
  UpdateMembershipAccessInput,
} from "../../../../domains/identity/ports/roleManagementRepository.js";

const state: RoleManagementState = {
  memberships: [
    {
      membershipId: "44444444-4444-4444-8444-444444444444" as never,
      overrides: [],
      role: "owner",
      status: "active",
      user: {
        email: "test@lojaveiculos.com.br",
        id: "88888888-8888-4888-8888-888888888888" as never,
        name: "Test Owner",
      },
    },
    {
      membershipId: "33333333-3333-4333-8333-333333333333" as never,
      overrides: [],
      role: "salesman",
      status: "active",
      user: {
        email: "seller@lojaveiculos.com.br",
        id: "99999999-9999-4999-8999-999999999999" as never,
        name: "Test Salesman",
      },
    },
    {
      membershipId: "22222222-2222-4222-8222-222222222222" as never,
      overrides: [],
      role: "investor",
      status: "active",
      user: {
        email: "investor@lojaveiculos.com.br",
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as never,
        name: "Test Investor",
      },
    },
  ],
  pendingInvitations: [],
  storeId: "66666666-6666-4666-8666-666666666666" as never,
  tenantId: "77777777-7777-4777-8777-777777777777" as never,
};

export function createMemoryRoleManagementRepository(): RoleManagementRepository {
  return {
    async listByStore(input) {
      return {
        ...state,
        storeId: input.storeId,
        tenantId: input.tenantId,
      };
    },
    async updateMembershipAccess(input: UpdateMembershipAccessInput) {
      const index = state.memberships.findIndex(
        (member) => member.membershipId === input.membershipId,
      );
      if (index >= 0) {
        state.memberships = state.memberships.map((member, memberIndex) =>
          memberIndex === index
            ? { ...member, overrides: input.overrides, role: input.role }
            : member,
        );
      }
      return { ...state, storeId: input.storeId, tenantId: input.tenantId };
    },
  };
}
