import type {
  PermissionKey,
  RoleKey,
  StoreId,
  StoreMembershipId,
  TenantId,
  UserId,
} from "@lojaveiculosv2/shared";

export type RoleMembershipUser = {
  email: string;
  id: UserId;
  name: string | null;
};

export type RolePermissionOverride = {
  allowed: boolean;
  permission: PermissionKey;
  reason: string | null;
};

export type RoleMembership = {
  membershipId: StoreMembershipId;
  overrides: readonly RolePermissionOverride[];
  role: RoleKey;
  status: "active" | "invited" | "suspended";
  user: RoleMembershipUser;
};

export type RoleManagementState = {
  memberships: readonly RoleMembership[];
  storeId: StoreId;
  tenantId: TenantId;
};

export type UpdateMembershipAccessInput = {
  membershipId: StoreMembershipId;
  overrides: readonly RolePermissionOverride[];
  role: RoleKey;
  storeId: StoreId;
  tenantId: TenantId;
};

export type RoleManagementRepository = {
  listByStore: (input: {
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<RoleManagementState>;
  updateMembershipAccess: (
    input: UpdateMembershipAccessInput,
  ) => Promise<RoleManagementState>;
};
