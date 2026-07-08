import { and, eq } from "drizzle-orm";
import {
  roleTemplates,
  storeMemberships,
  stores,
  tenantMemberships,
  tenants,
} from "@lojaveiculosv2/db";
import {
  hasActiveAgencyTenantMembership,
  resolveMembershipPermissions,
  resolveRolePermissions,
} from "./drizzleAccountProvisioningPermissions.js";
import type { DrizzleAccountProvisioningClient } from "./drizzleAccountProvisioningSupport.js";

export async function listStores(
  db: DrizzleAccountProvisioningClient,
  userId: string,
) {
  const [directRows, agencyRows] = await Promise.all([
    db
      .select({
        membershipId: storeMemberships.id,
        role: roleTemplates.roleKey,
        status: storeMemberships.status,
        storeId: stores.id,
        storeName: stores.tradingName,
        storeSlug: stores.publicSlug,
        tenantId: stores.tenantId,
        tenantName: tenants.tradingName,
      })
      .from(storeMemberships)
      .innerJoin(stores, eq(stores.id, storeMemberships.storeId))
      .innerJoin(tenants, eq(tenants.id, stores.tenantId))
      .innerJoin(
        roleTemplates,
        eq(roleTemplates.id, storeMemberships.roleTemplateId),
      )
      .where(
        and(
          eq(storeMemberships.userId, userId),
          eq(stores.isDeleted, false),
          eq(tenants.isDeleted, false),
        ),
      )
      .limit(100),
    db
      .select({
        role: roleTemplates.roleKey,
        status: tenantMemberships.status,
        storeId: stores.id,
        storeName: stores.tradingName,
        storeSlug: stores.publicSlug,
        tenantId: stores.tenantId,
        tenantName: tenants.tradingName,
      })
      .from(tenantMemberships)
      .innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId))
      .innerJoin(stores, eq(stores.tenantId, tenants.id))
      .innerJoin(
        roleTemplates,
        eq(roleTemplates.id, tenantMemberships.roleTemplateId),
      )
      .where(
        and(
          eq(tenantMemberships.userId, userId),
          eq(tenantMemberships.status, "active"),
          eq(roleTemplates.roleKey, "agency"),
          eq(stores.isDeleted, false),
          eq(tenants.isDeleted, false),
        ),
      )
      .limit(100),
  ]);
  const directStores = await Promise.all(
    directRows.map(async (row) => {
      const billingManagedBy: "agency" | "store_owner" =
        (await hasActiveAgencyTenantMembership(db, row.tenantId))
          ? "agency"
          : "store_owner";
      const effectivePermissions = await resolveMembershipPermissions(db, {
        billingManagedBy,
        membershipId: row.membershipId,
        role: row.role,
      });
      return {
        billingManagedBy,
        effectivePermissions,
        role: row.role,
        status: row.status,
        storeId: row.storeId as never,
        storeName: row.storeName,
        storeSlug: row.storeSlug,
        tenantId: row.tenantId as never,
        tenantName: row.tenantName,
      };
    }),
  );
  const storesById = new Map(
    directStores.map((store) => [store.storeId, store]),
  );
  for (const row of agencyRows) {
    if (storesById.has(row.storeId as never)) continue;
    storesById.set(row.storeId as never, {
      billingManagedBy: "agency",
      effectivePermissions: resolveRolePermissions({
        billingManagedBy: "agency",
        role: "agency",
      }),
      role: "agency",
      status: "active",
      storeId: row.storeId as never,
      storeName: row.storeName,
      storeSlug: row.storeSlug,
      tenantId: row.tenantId as never,
      tenantName: row.tenantName,
    });
  }
  return [...storesById.values()];
}
