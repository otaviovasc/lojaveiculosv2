import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  vehicleListings,
  vehicleMedia,
  vehicleUnits,
} from "@lojaveiculosv2/db";
import type {
  FindVehicleListingByPublicSlugInput,
  ListVehicleListingsInput,
  VehicleListing,
  VehicleMedia,
  VehicleUnit,
} from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";
import type { DrizzleRepositoryClient } from "../drizzleClient.js";
import {
  toVehicleListing,
  toVehicleMedia,
  toVehicleUnit,
  type InsertVehicleListingRow,
  type InsertVehicleMediaRow,
  type InsertVehicleUnitRow,
  type VehicleListingRow,
  type VehicleMediaRow,
  type VehicleUnitRow,
} from "./drizzleVehicleInventoryMappers.js";
import { requireDbScope } from "./drizzleVehicleInventoryScope.js";

type DrizzleVehicleListingReadClient = DrizzleRepositoryClient<
  VehicleListingRow,
  InsertVehicleListingRow,
  Partial<InsertVehicleListingRow>
>;
type DrizzleVehicleUnitReadClient = DrizzleRepositoryClient<
  VehicleUnitRow,
  InsertVehicleUnitRow,
  Partial<InsertVehicleUnitRow>
>;
type DrizzleVehicleMediaReadClient = DrizzleRepositoryClient<
  VehicleMediaRow,
  InsertVehicleMediaRow,
  never
>;

export type DrizzleVehicleInventoryReadClient =
  DrizzleVehicleListingReadClient &
    DrizzleVehicleUnitReadClient &
    DrizzleVehicleMediaReadClient;

export function matchesListingFilters(
  listing: VehicleListing,
  input: ListVehicleListingsInput,
): boolean {
  if (input.status && listing.status !== input.status) return false;
  if (!input.search) return true;
  const search = input.search.toLowerCase();

  return [listing.title, listing.plate, listing.description]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(search));
}

export async function findListingUnits(
  db: DrizzleVehicleUnitReadClient,
  listingId: string,
): Promise<readonly VehicleUnit[]> {
  return findListingsUnits(db, [listingId]);
}

export async function findListingByPublicSlug(
  db: DrizzleVehicleInventoryReadClient,
  input: FindVehicleListingByPublicSlugInput,
): Promise<VehicleListing | null> {
  const scope = requireDbScope(input);
  const listingDb = db as DrizzleVehicleListingReadClient;
  const [row] = await listingDb
    .select()
    .from(vehicleListings)
    .where(
      and(
        eq(vehicleListings.publicSlug, input.publicSlug),
        eq(vehicleListings.storeId, scope.storeId),
        eq(vehicleListings.tenantId, scope.tenantId),
        eq(vehicleListings.isDeleted, false),
        isNull(vehicleListings.deletedAt),
      ),
    );

  return row ? toVehicleListing(row, await findListingUnits(db, row.id)) : null;
}

export async function findListingsUnits(
  db: DrizzleVehicleUnitReadClient,
  listingIds: readonly string[],
): Promise<readonly VehicleUnit[]> {
  if (listingIds.length === 0) return [];
  const unitDb = db as DrizzleVehicleUnitReadClient;
  const rows = await unitDb
    .select()
    .from(vehicleUnits)
    .where(
      and(
        inArray(vehicleUnits.listingId, [...listingIds]),
        eq(vehicleUnits.isDeleted, false),
        isNull(vehicleUnits.deletedAt),
      ),
    );

  return rows.map(toVehicleUnit);
}

export async function findListingsMedia(
  db: DrizzleVehicleInventoryReadClient,
  listingIds: readonly string[],
): Promise<readonly VehicleMedia[]> {
  if (listingIds.length === 0) return [];
  const units = await findListingsUnits(db, listingIds);

  return findUnitsMedia(
    db,
    units.map((unit) => unit.id),
  );
}

export async function findUnitsMedia(
  db: DrizzleVehicleMediaReadClient,
  unitIds: readonly string[],
): Promise<readonly VehicleMedia[]> {
  if (unitIds.length === 0) return [];
  const mediaDb = db as DrizzleVehicleMediaReadClient;
  const rows = await mediaDb
    .select()
    .from(vehicleMedia)
    .where(
      and(
        inArray(vehicleMedia.unitId, [...unitIds]),
        eq(vehicleMedia.isDeleted, false),
        isNull(vehicleMedia.deletedAt),
      ),
    );

  return rows.map(toVehicleMedia);
}
