import { and, asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  roleTemplates,
  stores,
  tenantMemberships,
  tenants,
} from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type { AgencyTeamAccessStoreDirectory } from "../../domains/agency/ports/agencyTeamAccessRepository.js";

export type DrizzleAgencyTeamAccessClient = PostgresJsDatabase<typeof schema>;

export function createDrizzleAgencyTeamAccessStoreDirectory(
  db: DrizzleAgencyTeamAccessClient,
): AgencyTeamAccessStoreDirectory {
  return {
    async listStores(input) {
      const rows = await db
        .select({
          storeId: stores.id,
          storeName: stores.tradingName,
          storeSlug: stores.publicSlug,
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
            eq(tenantMemberships.userId, input.userId),
            eq(tenantMemberships.tenantId, input.tenantId),
            eq(tenantMemberships.status, "active"),
            eq(roleTemplates.roleKey, "agency"),
            eq(stores.isDeleted, false),
            eq(tenants.isDeleted, false),
          ),
        )
        .orderBy(asc(stores.tradingName))
        .limit(200);

      return rows.map((row) => ({
        ...row,
        storeId: row.storeId as never,
      }));
    },
  };
}
