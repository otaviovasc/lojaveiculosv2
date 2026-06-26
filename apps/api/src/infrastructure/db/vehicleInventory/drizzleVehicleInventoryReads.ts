import { and, eq, inArray, isNull } from "drizzle-orm";
import { vehicleMedia, vehicleUnits } from "@lojaveiculosv2/db";
import type {
  ListVehicleListingsInput,
  VehicleListing,
  VehicleMedia,
  VehicleUnit,
} from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";
import type { DrizzleRepositoryClient } from "../drizzleClient.js";
import {
  toVehicleMedia,
  toVehicleUnit,
  type InsertVehicleMediaRow,
  type InsertVehicleUnitRow,
  type VehicleMediaRow,
  type VehicleUnitRow,
} from "./drizzleVehicleInventoryMappers.js";

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

export type DrizzleVehicleInventoryReadClient = DrizzleVehicleUnitReadClient &
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
