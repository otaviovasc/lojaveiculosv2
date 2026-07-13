import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import type { StoredRows } from "./drizzleStoreAccessRepository.testRows.js";

export function createStoreAccessRows(overrides: Partial<StoredRows> = {}) {
  const tenantId = "tenant_1" as TenantId;
  const storeId = "store_1" as StoreId;
  const userId = "user_1" as UserId;

  return {
    entitlements: overrides.entitlements ?? [
      {
        endsAt: null,
        featureKey: "crm",
        startsAt: null,
        status: "active",
        storeId,
      },
      {
        endsAt: new Date("2099-01-01T00:00:00.000Z"),
        featureKey: "subdomain",
        startsAt: new Date("2026-01-01T00:00:00.000Z"),
        status: "trialing",
        storeId,
      },
      {
        endsAt: null,
        featureKey: "nfe",
        startsAt: null,
        status: "inactive",
        storeId,
      },
    ],
    memberships: overrides.memberships ?? [
      {
        id: "membership_1",
        roleTemplateId: "role_salesman",
        status: "active",
        storeId,
        tenantId,
        userId,
      },
    ],
    overrides: overrides.overrides ?? [
      {
        allowed: true,
        membershipId: "membership_1",
        permissionKey: "inventory.update_price",
      },
      {
        allowed: false,
        membershipId: "membership_1",
        permissionKey: "inventory.create",
      },
    ],
    roleTemplates: overrides.roleTemplates ?? [
      { id: "role_salesman", roleKey: "salesman" },
    ],
    stores: overrides.stores ?? [
      {
        deletedAt: null,
        id: storeId,
        isDeleted: false,
        publicSlug: "demo",
        tenantId,
      },
    ],
    tenantMemberships: overrides.tenantMemberships ?? [
      {
        roleTemplateId: "role_owner",
        status: "active",
        tenantId,
        userId,
      },
    ],
    users: overrides.users ?? [
      {
        clerkUserId: "clerk_1",
        deletedAt: null,
        id: userId,
        isDeleted: false,
      },
    ],
  };
}
