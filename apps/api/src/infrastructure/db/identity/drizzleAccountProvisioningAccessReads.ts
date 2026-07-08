import { and, eq } from "drizzle-orm";
import {
  roleTemplates,
  storeMemberships,
  stores,
  tenants,
} from "@lojaveiculosv2/db";
import type { DrizzleAccountProvisioningClient } from "./drizzleAccountProvisioningSupport.js";
import {
  hasActivePlatformAdmin,
  listTenantMemberships,
} from "./drizzleAccountProvisioningReads.js";
import { listStores } from "./drizzleAccountProvisioningStoreReads.js";

export async function findActiveStoreRole(
  db: DrizzleAccountProvisioningClient,
  input: { storeId: string; userId: string },
) {
  const [membership] = await db
    .select({ role: roleTemplates.roleKey })
    .from(storeMemberships)
    .innerJoin(stores, eq(stores.id, storeMemberships.storeId))
    .innerJoin(tenants, eq(tenants.id, stores.tenantId))
    .innerJoin(
      roleTemplates,
      eq(roleTemplates.id, storeMemberships.roleTemplateId),
    )
    .where(
      and(
        eq(storeMemberships.storeId, input.storeId),
        eq(storeMemberships.userId, input.userId),
        eq(storeMemberships.status, "active"),
        eq(stores.isDeleted, false),
        eq(tenants.isDeleted, false),
      ),
    )
    .limit(1);
  return membership?.role ?? null;
}

export async function canCreateOwnerStore(
  db: DrizzleAccountProvisioningClient,
  userId: string,
) {
  const [storesList, tenantList, platformAdmin] = await Promise.all([
    listStores(db, userId),
    listTenantMemberships(db, userId),
    hasActivePlatformAdmin(db, userId),
  ]);
  return !platformAdmin && storesList.length === 0 && tenantList.length === 0;
}
