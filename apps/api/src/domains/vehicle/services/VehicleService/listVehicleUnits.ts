import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  VehicleListing,
  VehicleListingRepository,
  VehicleUnit,
  VehicleUnitRepository,
  VehicleUnitStatus,
} from "../../ports/vehicleInventoryRepository.js";
import {
  createUnitSummary,
  type VehicleUnitListResult,
} from "../../readModels/vehicleReadModels.js";
import {
  auditVehicleServiceEvent,
  findScopedListing,
  getListingRepository,
  getMediaRepository,
  getUnitRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.read";

export type ListVehicleUnitsInput = {
  limit?: number;
  offset?: number;
  search?: string | null;
  status?: VehicleUnitStatus | null;
};

export async function listVehicleUnits(
  context: ServiceContext,
  input: ListVehicleUnitsInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleUnitListResult> {
  assertPermission(context, permission);
  const scope = { storeId: context.storeId, tenantId: context.tenantId };
  const limit = clampLimit(input.limit);
  const offset = clampOffset(input.offset);
  const search = cleanSearch(input.search);
  const unitRepository = getUnitRepository(ports);
  const listingRepository = getListingRepository(ports);
  const page =
    search === null
      ? await listUnitPage(context, unitRepository, listingRepository, {
          limit,
          offset,
          status: input.status ?? null,
        })
      : await searchUnitPage(context, unitRepository, listingRepository, {
          limit,
          offset,
          search,
          status: input.status ?? null,
        });
  const media = await getMediaRepository(ports).listByUnitIds({
    ...scope,
    unitIds: page.units.map((unit) => unit.id),
  });

  const items = page.units.flatMap((unit) => {
    const listing = page.listingsById.get(unit.listingId);
    if (!listing) return [];
    return [
      createUnitSummary({
        listing,
        media,
        unit,
      }),
    ];
  });

  logVehicleServiceEvent(context, "vehicle_unit.list.read", {
    count: page.units.length,
    offset,
    search,
    status: input.status ?? null,
  });

  await auditVehicleServiceEvent(context, {
    action: "vehicle_unit.list.read",
    category: "data_access",
    entityId: `vehicle_units:${context.storeId ?? "unscoped"}`,
    metadata: {
      count: page.units.length,
      offset,
      search,
      status: input.status ?? null,
    },
    permission,
    summary: "Listed vehicle units",
  });

  return {
    hasMore: page.hasMore,
    items,
    nextOffset: page.hasMore ? offset + page.units.length : null,
    total: offset + page.units.length,
  };
}

type UnitPage = {
  hasMore: boolean;
  listingsById: Map<string, VehicleListing>;
  units: readonly VehicleUnit[];
};

async function listUnitPage(
  context: ServiceContext,
  unitRepository: VehicleUnitRepository,
  listingRepository: VehicleListingRepository,
  input: { limit: number; offset: number; status: VehicleUnitStatus | null },
): Promise<UnitPage> {
  const units = await unitRepository.list({
    storeId: context.storeId,
    tenantId: context.tenantId,
    limit: input.limit + 1,
    offset: input.offset,
    status: input.status,
  });
  const pageUnits = units.slice(0, input.limit);

  return {
    hasMore: units.length > input.limit,
    listingsById: await loadListingsById(context, listingRepository, pageUnits),
    units: pageUnits,
  };
}

async function searchUnitPage(
  context: ServiceContext,
  unitRepository: VehicleUnitRepository,
  listingRepository: VehicleListingRepository,
  input: {
    limit: number;
    offset: number;
    search: string;
    status: VehicleUnitStatus | null;
  },
): Promise<UnitPage> {
  const pageSize = 500;
  const neededMatches = input.offset + input.limit + 1;
  const matches: VehicleUnit[] = [];
  const listingsById = new Map<string, VehicleListing>();
  let scanOffset = 0;

  while (matches.length < neededMatches) {
    const batch = await unitRepository.list({
      storeId: context.storeId,
      tenantId: context.tenantId,
      limit: pageSize,
      offset: scanOffset,
      status: input.status,
    });
    if (batch.length === 0) break;

    const batchListings = await loadListingsById(
      context,
      listingRepository,
      batch,
    );
    for (const [listingId, listing] of batchListings) {
      listingsById.set(listingId, listing);
    }
    matches.push(
      ...batch.filter((unit) =>
        unitMatchesSearch(unit, listingsById.get(unit.listingId), input.search),
      ),
    );
    scanOffset += batch.length;
    if (batch.length < pageSize) break;
  }

  return {
    hasMore: matches.length > input.offset + input.limit,
    listingsById,
    units: matches.slice(input.offset, input.offset + input.limit),
  };
}

async function loadListingsById(
  context: ServiceContext,
  listingRepository: VehicleListingRepository,
  units: readonly VehicleUnit[],
) {
  const listings = await Promise.all(
    [...new Set(units.map((unit) => unit.listingId))].map((listingId) =>
      findScopedListing(context, listingRepository, listingId),
    ),
  );
  return new Map(listings.map((listing) => [listing.id, listing]));
}

function unitMatchesSearch(
  unit: VehicleUnit,
  listing: VehicleListing | undefined,
  search: string,
): boolean {
  return [
    listing?.description,
    listing?.plate,
    listing?.title,
    unit.colorName,
    unit.plate,
    unit.stockNumber,
    unit.vin,
  ]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(search));
}

function clampLimit(value: number | undefined): number {
  if (!value) return 50;
  return Math.min(Math.max(value, 1), 100);
}

function clampOffset(value: number | undefined): number {
  if (!value) return 0;
  return Math.max(value, 0);
}

function cleanSearch(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}
