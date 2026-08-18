import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";

export type CrmAssigneeMembershipRepository = {
  isActiveStoreMember: (input: {
    storeId: StoreId;
    tenantId: TenantId;
    userId: UserId;
  }) => Promise<boolean>;
};
