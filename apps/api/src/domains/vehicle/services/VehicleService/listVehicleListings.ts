import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { VehicleListingStatus } from "../../ports/vehicleInventoryRepository.js";
import {
  auditVehicleServiceEvent,
  getListingRepository,
  getMediaRepository,
  getUnitRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";
import {
  createListingSummary,
  type VehicleListingListResult,
} from "../../readModels/vehicleReadModels.js";

const permission = "inventory.read";

export type ListVehicleListingsInput = {
  limit?: number;
  offset?: number;
  search?: string | null;
  status?: VehicleListingStatus | null;
};

export async function listVehicleListings(
  context: ServiceContext,
  input: ListVehicleListingsInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleListingListResult> {
  assertPermission(context, permission);
  const listingRepository = getListingRepository(ports);
  const scope = { storeId: context.storeId, tenantId: context.tenantId };
  const limit = clampLimit(input.limit);
  const offset = clampOffset(input.offset);
  const listings = await listingRepository.list({
    ...scope,
    limit: limit + 1,
    offset,
    search: cleanSearch(input.search),
    status: input.status ?? null,
  });
  const pageListings = listings.slice(0, limit);
  const listingIds = pageListings.map((listing) => listing.id);
  const [units, media] = await Promise.all([
    getUnitRepository(ports).listByListingIds({ ...scope, listingIds }),
    getMediaRepository(ports).listByListingIds({ ...scope, listingIds }),
  ]);

  logVehicleServiceEvent(context, "vehicle_listing.list.read", {
    count: pageListings.length,
    offset,
    search: input.search ?? null,
    status: input.status ?? null,
  });

  await auditVehicleServiceEvent(context, {
    action: "vehicle_listing.list.read",
    category: "data_access",
    entityId: `vehicle_listings:${context.storeId ?? "unscoped"}`,
    metadata: {
      count: pageListings.length,
      offset,
      search: input.search ?? null,
      status: input.status ?? null,
    },
    permission,
    summary: "Listed vehicle inventory",
  });

  return {
    hasMore: listings.length > limit,
    items: pageListings.map((listing) =>
      createListingSummary({
        listing,
        media: media.filter((item) => item.listingId === listing.id),
        units: units.filter((unit) => unit.listingId === listing.id),
      }),
    ),
    nextOffset: listings.length > limit ? offset + pageListings.length : null,
    total: offset + pageListings.length,
  };
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
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
