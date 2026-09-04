import { vehicleListings, vehicleUnits } from "@lojaveiculosv2/db";
import { and, eq, sql, type SQL } from "drizzle-orm";
import {
  scoped,
  type DashboardScope,
  type RuntimeAnalyticsClient,
} from "./runtimeAnalyticsSupport.js";

export async function getInventory(
  db: RuntimeAnalyticsClient,
  input: DashboardScope,
) {
  const [listingRow, unitRow, ageRow] = await Promise.all([
    db
      .select({
        averagePriceCents: sql<number>`coalesce(avg(${vehicleListings.askingPriceCents}), 0)::int`,
        // Listing-level value: one asking price per published listing,
        // regardless of how many available units are linked to it.
        availableAskingValueCents: sql<number>`coalesce(sum(${vehicleListings.askingPriceCents}) filter (where ${vehicleListings.status} = 'published'), 0)::int`,
        availableListings: sql<number>`count(*) filter (where ${vehicleListings.status} = 'published')::int`,
        soldListings: sql<number>`count(*) filter (where ${vehicleListings.status} = 'sold_out')::int`,
        totalListings: sql<number>`count(*)::int`,
      })
      .from(vehicleListings)
      .where(scoped(vehicleListings, input)),
    db
      .select({
        reservedListings: sql<number>`count(distinct ${vehicleUnits.listingId}) filter (where ${vehicleUnits.status} = 'reserved')::int`,
      })
      .from(vehicleUnits)
      .where(scoped(vehicleUnits, input)),
    getAgeBuckets(db, input),
  ]);
  const listing = listingRow[0];
  const unit = unitRow[0];

  return {
    ...{
      averagePriceCents: 0,
      availableListings: 0,
      soldListings: 0,
      totalListings: 0,
    },
    ...listing,
    ageBuckets: {
      days0to30: ageRow[0]?.days0to30 ?? 0,
      days31to60: ageRow[0]?.days31to60 ?? 0,
      days61to90: ageRow[0]?.days61to90 ?? 0,
      over90: ageRow[0]?.over90 ?? 0,
    },
    reservedListings: unit?.reservedListings ?? 0,
    availableAskingValueCents: listing?.availableAskingValueCents ?? 0,
  };
}

export async function getHomeInventory(
  db: RuntimeAnalyticsClient,
  input: DashboardScope,
) {
  const rows = await db
    .select({
      availableListings: sql<number>`count(*) filter (where ${vehicleListings.status} = 'published')::int`,
      totalListings: sql<number>`count(*)::int`,
    })
    .from(vehicleListings)
    .where(scoped(vehicleListings, input));

  return {
    availableListings: rows[0]?.availableListings ?? 0,
    totalListings: rows[0]?.totalListings ?? 0,
  };
}

// Age of available units, counted from the unit acquisition date and
// falling back to the listing creation date when it is missing.
function getAgeBuckets(db: RuntimeAnalyticsClient, input: DashboardScope) {
  return db
    .select({
      days0to30: sql<number>`count(*) filter (where ${ageSinceAcquisition()} <= 30)::int`,
      days31to60: sql<number>`count(*) filter (where ${ageSinceAcquisition()} between 31 and 60)::int`,
      days61to90: sql<number>`count(*) filter (where ${ageSinceAcquisition()} between 61 and 90)::int`,
      over90: sql<number>`count(*) filter (where ${ageSinceAcquisition()} > 90)::int`,
    })
    .from(vehicleUnits)
    .innerJoin(vehicleListings, eq(vehicleUnits.listingId, vehicleListings.id))
    .where(
      and(scoped(vehicleUnits, input), eq(vehicleUnits.status, "available")),
    );
}

function ageSinceAcquisition(): SQL<number> {
  return sql<number>`extract(day from now() - coalesce(${vehicleUnits.acquisitionDate}, ${vehicleListings.createdAt}))::int`;
}
