import {
  leads,
  sales,
  stores,
  vehicleListings,
  vehicleUnits,
} from "@lojaveiculosv2/db";
import { and, eq, sql, type SQL } from "drizzle-orm";
import type * as schema from "@lojaveiculosv2/db";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  AgencyStatsStoreNotFoundError,
  type AgencyStatsRepository,
} from "../../domains/agency/ports/agencyStatsRepository.js";
import { saoPauloBusinessDayRange } from "../../shared/time/saoPauloBusinessDay.js";
import { buildAgencyStatsReport } from "./drizzleAgencyStatsModel.js";

export type DrizzleAgencyStatsClient = PostgresJsDatabase<typeof schema>;

export function createDrizzleAgencyStatsRepository(
  db: DrizzleAgencyStatsClient,
): AgencyStatsRepository {
  return {
    async getStats(input) {
      const availableStores = await db
        .select({
          storeId: stores.id,
          storeName: stores.tradingName,
          storeSlug: stores.publicSlug,
        })
        .from(stores)
        .where(
          and(eq(stores.tenantId, input.tenantId), eq(stores.isDeleted, false)),
        )
        .orderBy(stores.tradingName, stores.id);

      if (
        input.storeId &&
        !availableStores.some((store) => store.storeId === input.storeId)
      ) {
        throw new AgencyStatsStoreNotFoundError();
      }

      const scopeStoreIds = input.storeId
        ? new Set([input.storeId])
        : new Set(availableStores.map((store) => store.storeId));
      const scopedStores = availableStores.filter((store) =>
        scopeStoreIds.has(store.storeId),
      );
      const periodRange = saoPauloBusinessDayRange(input.period);
      const [listingRows, unitRows, saleRows, leadRows] = await Promise.all([
        getListings(db, input),
        getReservedUnits(db, input),
        getSales(db, input, periodRange),
        getLeads(db, input, periodRange),
      ]);
      return buildAgencyStatsReport(input, availableStores, scopedStores, {
        leadRows,
        listingRows,
        saleRows,
        unitRows,
      });
    },
  };
}

function getListings(
  db: DrizzleAgencyStatsClient,
  input: Parameters<AgencyStatsRepository["getStats"]>[0],
) {
  return db
    .select({
      availableListings: sql<number>`count(*) filter (where ${vehicleListings.status} = 'published')::int`,
      storeId: vehicleListings.storeId,
      totalListings: sql<number>`count(*)::int`,
    })
    .from(vehicleListings)
    .where(scope(vehicleListings, input))
    .groupBy(vehicleListings.storeId);
}

function getReservedUnits(
  db: DrizzleAgencyStatsClient,
  input: Parameters<AgencyStatsRepository["getStats"]>[0],
) {
  return db
    .select({
      reservedUnits: sql<number>`count(*) filter (where ${vehicleUnits.status} = 'reserved')::int`,
      storeId: vehicleUnits.storeId,
    })
    .from(vehicleUnits)
    .where(scope(vehicleUnits, input))
    .groupBy(vehicleUnits.storeId);
}

function getSales(
  db: DrizzleAgencyStatsClient,
  input: Parameters<AgencyStatsRepository["getStats"]>[0],
  periodRange: ReturnType<typeof saoPauloBusinessDayRange>,
) {
  return db
    .select({
      closedCount: sql<number>`count(*)::int`,
      grossMarginCents: sql<number>`coalesce(sum(${sales.salePriceCents} - coalesce(${vehicleUnits.acquisitionPriceCents}, 0)), 0)::int`,
      revenueCents: sql<number>`coalesce(sum(${sales.salePriceCents}), 0)::int`,
      storeId: sales.storeId,
    })
    .from(sales)
    .leftJoin(vehicleUnits, eq(sales.unitId, vehicleUnits.id))
    .where(
      and(
        scope(sales, input),
        eq(sales.status, "closed"),
        eq(sales.isCurrentRevision, true),
        sql`${sales.closedAt} >= ${periodRange.from}`,
        sql`${sales.closedAt} < ${periodRange.toExclusive}`,
      ),
    )
    .groupBy(sales.storeId);
}

function getLeads(
  db: DrizzleAgencyStatsClient,
  input: Parameters<AgencyStatsRepository["getStats"]>[0],
  periodRange: ReturnType<typeof saoPauloBusinessDayRange>,
) {
  return db
    .select({
      count: sql<number>`count(*)::int`,
      source: leads.source,
      status: leads.status,
      storeId: leads.storeId,
    })
    .from(leads)
    .where(
      and(
        scope(leads, input),
        sql`${leads.createdAt} >= ${periodRange.from}`,
        sql`${leads.createdAt} < ${periodRange.toExclusive}`,
      ),
    )
    .groupBy(leads.storeId, leads.source, leads.status);
}

function scope(
  table:
    typeof leads | typeof sales | typeof vehicleListings | typeof vehicleUnits,
  input: { storeId?: string; tenantId: string },
): SQL<unknown> | undefined {
  return and(
    eq(table.tenantId, input.tenantId),
    eq(table.isDeleted, false),
    ...(input.storeId ? [eq(table.storeId, input.storeId)] : []),
  );
}
