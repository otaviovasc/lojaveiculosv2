import { and, eq, inArray, ne, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { leadVehicleInterests, leads } from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type { VehicleLeadInterestCounter } from "../../../domains/vehicle/ports/vehicleLeadInterestCounter.js";

type CrmDatabase = PostgresJsDatabase<typeof schema>;

/**
 * Anti-corruption adapter exposing CRM lead interest data to the vehicle
 * domain. Counts DISTINCT non-archived, non-deleted leads per listing,
 * matching the CRM lead board filters (see buildCrmLeadFilters).
 */
export function createDrizzleVehicleLeadInterestCounter(
  db: CrmDatabase,
): VehicleLeadInterestCounter {
  return {
    async countLeadsByListingIds({ listingIds, storeId, tenantId }) {
      const counts = new Map<string, number>();
      if (!listingIds.length || !storeId || !tenantId) return counts;

      const rows = await db
        .select({
          listingId: leadVehicleInterests.listingId,
          value: sql<number>`count(distinct ${leadVehicleInterests.leadId})::int`,
        })
        .from(leadVehicleInterests)
        .innerJoin(leads, eq(leads.id, leadVehicleInterests.leadId))
        .where(
          and(
            inArray(leadVehicleInterests.listingId, [...listingIds]),
            eq(leadVehicleInterests.storeId, storeId),
            eq(leadVehicleInterests.tenantId, tenantId),
            eq(leads.storeId, storeId),
            eq(leads.tenantId, tenantId),
            eq(leads.isDeleted, false),
            ne(leads.status, "archived"),
          ),
        )
        .groupBy(leadVehicleInterests.listingId);

      for (const row of rows) {
        counts.set(row.listingId, Number(row.value));
      }
      return counts;
    },
  };
}
