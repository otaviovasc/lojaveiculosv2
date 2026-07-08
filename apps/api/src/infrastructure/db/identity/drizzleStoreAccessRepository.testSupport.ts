import {
  membershipPermissionOverrides,
  roleTemplates,
  storeEntitlements,
  storeMemberships,
  stores,
  tenantMemberships,
  users,
} from "@lojaveiculosv2/db";
import type { DrizzleStoreAccessClient } from "./drizzleStoreAccessRepository.js";
import { createStoreAccessRows } from "./drizzleStoreAccessRepository.testData.js";
import type { StoredRows } from "./drizzleStoreAccessRepository.testRows.js";

export { createStoreAccessRows };

export function createFakeStoreAccessDb(initialRows: Partial<StoredRows> = {}) {
  const rows = createStoreAccessRows(initialRows);
  const queriedTables: unknown[] = [];

  const db = {
    queriedTables,
    select(selection: Record<string, unknown>) {
      return {
        from(table: unknown) {
          queriedTables.push(table);
          const joinedTables: unknown[] = [];
          const builder = {
            innerJoin(joinedTable: unknown) {
              queriedTables.push(joinedTable);
              joinedTables.push(joinedTable);
              return builder;
            },
            leftJoin(joinedTable: unknown) {
              queriedTables.push(joinedTable);
              joinedTables.push(joinedTable);
              return builder;
            },
            async limit(count: number) {
              return selectRows(table, selection, joinedTables, rows).slice(
                0,
                count,
              );
            },
            where() {
              return {
                async limit(count: number) {
                  return selectRows(table, selection, joinedTables, rows).slice(
                    0,
                    count,
                  );
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

function selectRows(
  table: unknown,
  selection: Record<string, unknown>,
  joinedTables: readonly unknown[],
  rows: StoredRows,
): readonly unknown[] {
  if (table === users) {
    return joinedTables.includes(tenantMemberships) &&
      !("membershipId" in selection)
      ? findAgencyTenantAccessRows(rows)
      : findAccessRows(rows);
  }
  if (table === membershipPermissionOverrides) return findOverrideRows(rows);
  if (table === storeEntitlements) return findEntitlementRows(rows);
  if (table === tenantMemberships) return findTenantBillingOwnerRows(rows);

  throw new Error(`Unhandled fake identity table: ${String(table)}`);
}

function findTenantBillingOwnerRows(rows: StoredRows) {
  const access = findAnyAccessRows(rows)[0];
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

function findAgencyTenantAccessRows(rows: StoredRows) {
  return rows.tenantMemberships.flatMap((membership) => {
    if (membership.status !== "active") return [];

    const user = rows.users.find(
      (candidate) =>
        candidate.id === membership.userId &&
        !candidate.isDeleted &&
        candidate.deletedAt === null,
    );
    const store = rows.stores.find(
      (candidate) =>
        candidate.tenantId === membership.tenantId &&
        !candidate.isDeleted &&
        candidate.deletedAt === null,
    );
    const role = rows.roleTemplates.find(
      (candidate) => candidate.id === membership.roleTemplateId,
    );

    if (!user || !store || role?.roleKey !== "agency") return [];

    return {
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
  const access = findAnyAccessRows(rows)[0];
  if (!access) return [];

  return rows.entitlements
    .filter(
      (entitlement) =>
        entitlement.storeId === access.storeId &&
        (entitlement.status === "active" || entitlement.status === "trialing"),
    )
    .map((entitlement) => ({ entitlement: entitlement.featureKey }));
}

function findAnyAccessRows(rows: StoredRows) {
  return [...findAccessRows(rows), ...findAgencyTenantAccessRows(rows)];
}
