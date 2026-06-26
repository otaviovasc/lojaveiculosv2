import type {
  ListVehicleChildrenInput,
  VehicleListing,
  VehicleMedia,
  VehicleUnit,
} from "./ports/vehicleInventoryRepository.js";

export function matchesSearch(
  listing: VehicleListing,
  search: string | null,
): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();

  return [listing.title, listing.plate, listing.description]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(normalized));
}

export function isScopedChild(
  item: {
    listingId: string;
    storeId: string | null;
    tenantId: string | null;
  },
  input: ListVehicleChildrenInput,
): boolean {
  return (
    input.listingIds.includes(item.listingId) &&
    item.storeId === input.storeId &&
    item.tenantId === input.tenantId
  );
}

export function isScopedMediaForListings(
  item: VehicleMedia,
  units: Map<string, VehicleUnit>,
  input: ListVehicleChildrenInput,
): boolean {
  const unit = units.get(item.unitId);
  return Boolean(
    unit &&
    input.listingIds.includes(unit.listingId) &&
    item.storeId === input.storeId &&
    item.tenantId === input.tenantId,
  );
}
