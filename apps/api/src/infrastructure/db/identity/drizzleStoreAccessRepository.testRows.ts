import type {
  EntitlementKey,
  PermissionKey,
  RoleKey,
  StoreId,
  TenantId,
  UserId,
} from "@lojaveiculosv2/shared";

export type UserRow = {
  clerkUserId: string;
  deletedAt: Date | null;
  id: UserId;
  isDeleted: boolean;
};

export type StoreRow = {
  deletedAt: Date | null;
  id: StoreId;
  isDeleted: boolean;
  publicSlug: string;
  tenantId: TenantId;
};

export type TenantRow = {
  deletedAt: Date | null;
  id: TenantId;
  isDeleted: boolean;
};

export type MembershipRow = {
  id: string;
  roleTemplateId: string;
  status: "active" | "invited" | "suspended";
  storeId: StoreId;
  tenantId: TenantId;
  userId: UserId;
};

export type TenantMembershipRow = {
  roleTemplateId: string;
  status: "active" | "invited" | "suspended";
  tenantId: TenantId;
  userId: UserId;
};

export type RoleTemplateRow = {
  id: string;
  roleKey: RoleKey;
};

export type OverrideRow = {
  allowed: boolean;
  membershipId: string;
  permissionKey: PermissionKey;
};

export type EntitlementRow = {
  endsAt: Date | null;
  featureKey: EntitlementKey;
  startsAt: Date | null;
  status: "active" | "inactive" | "trialing" | "suspended";
  storeId: StoreId;
};

export type StoredRows = {
  entitlements: EntitlementRow[];
  memberships: MembershipRow[];
  overrides: OverrideRow[];
  roleTemplates: RoleTemplateRow[];
  stores: StoreRow[];
  tenants: TenantRow[];
  tenantMemberships: TenantMembershipRow[];
  users: UserRow[];
};
