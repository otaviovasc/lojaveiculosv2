import {
  membershipPermissionOverrides,
  roleTemplates,
  storeEntitlements,
  storeMemberships,
  stores,
  tenantMemberships,
  users,
} from "@lojaveiculosv2/db";
import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import type { DrizzleStoreAccessClient } from "./drizzleStoreAccessRepository.js";
import type { StoredRows } from "./drizzleStoreAccessRepository.testRows.js";

export function createFakeStoreAccessDb(initialRows: Partial<StoredRows> = {}) {
  const rows = createStoreAccessRows(initialRows);
  const queriedTables: unknown[] = [];

  const db = {
    queriedTables,
    select(selection: Record<string, unknown>) {
      return {
        from(table: unknown) {
          queriedTables.push(table);
          const builder = {
            innerJoin(joinedTable: unknown) {
              queriedTables.push(joinedTable);
              return builder;
            },
            leftJoin(joinedTable: unknown) {
              queriedTables.push(joinedTable);
              return builder;
            },
            async limit(count: number) {
              return selectRows(table, selection, rows).slice(0, count);
            },
            where() {
              return {
                async limit(count: number) {
                  return selectRows(table, selection, rows).slice(0, count);
                },
              };
            },
          };
          return builder;
        },
      };
    },
  };

  return db as typeof db & DrizzleStoreAccessClient;
}

export function createStoreAccessRows(overrides: Partial<StoredRows> = {}) {
  const tenantId = "tenant_1" as TenantId;
  const storeId = "store_1" as StoreId;
  const userId = "user_1" as UserId;

  return {
    entitlements: overrides.entitlements ?? [
      { featureKey: "crm", status: "active", storeId },
      { featureKey: "subdomain", status: "trialing", storeId },
      { featureKey: "nfe", status: "inactive", storeId },
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

function selectRows(
  table: unknown,
  selection: Record<string, unknown>,
  rows: StoredRows,
): readonly unknown[] {
  if (table === users) return findAccessRows(rows);
  if (table === membershipPermissionOverrides) return findOverrideRows(rows);
  if (table === storeEntitlements) return findEntitlementRows(rows);
  if (table === tenantMemberships) return findTenantBillingOwnerRows(rows);

  throw new Error(`Unhandled fake identity table: ${String(table)}`);
}

function findTenantBillingOwnerRows(rows: StoredRows) {
  const access = findAccessRows(rows)[0];
  if (!access) return [];

  return rows.tenantMemberships.flatMap((membership) => {
    const role = rows.roleTemplates.find(
      (candidate) => candidate.id === membership.roleTemplateId,
    );
    if (
      membership.status !== "active" ||
      membership.tenantId !== access.tenantId ||
      role?.roleKey !== "agency"
    ) {
      return [];
    }

    return [{ role: role.roleKey }];
  });
}

function findAccessRows(rows: StoredRows) {
  return rows.memberships.flatMap((membership) => {
    if (membership.status !== "active") return [];

    const user = rows.users.find(
      (candidate) =>
        candidate.id === membership.userId &&
        !candidate.isDeleted &&
        candidate.deletedAt === null,
    );
    const store = rows.stores.find(
      (candidate) =>
        candidate.id === membership.storeId &&
        !candidate.isDeleted &&
        candidate.deletedAt === null,
    );
    const role = rows.roleTemplates.find(
      (candidate) => candidate.id === membership.roleTemplateId,
    );

    if (!user || !store || !role) return [];

    return {
      membershipId: membership.id,
      role: role.roleKey,
      storeId: store.id,
      tenantId: store.tenantId,
      userId: user.id,
    };
  });
}

function findOverrideRows(rows: StoredRows) {
  const access = findAccessRows(rows)[0];
  if (!access) return [];

  return rows.overrides
    .filter((override) => override.membershipId === access.membershipId)
    .map((override) => ({
      allowed: override.allowed,
      permission: override.permissionKey,
    }));
}

function findEntitlementRows(rows: StoredRows) {
  const access = findAccessRows(rows)[0];
  if (!access) return [];

  return rows.entitlements
    .filter(
      (entitlement) =>
        entitlement.storeId === access.storeId &&
        (entitlement.status === "active" || entitlement.status === "trialing"),
    )
    .map((entitlement) => ({ entitlement: entitlement.featureKey }));
}
