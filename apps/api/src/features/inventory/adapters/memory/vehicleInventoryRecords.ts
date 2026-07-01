import type {
  CreateVehicleDocumentRecord,
  CreateVehicleListingRecord,
  CreateVehicleMediaRecord,
  CreateVehicleUnitRecord,
  ListVehicleDocumentsInput,
  VehicleDocument,
  VehicleListing,
  VehicleMedia,
  VehicleUnit,
} from "../../../../domains/vehicle/ports/vehicleInventoryRepository.js";

export function createListingRecord(
  record: CreateVehicleListingRecord,
  sequence: number,
): VehicleListing {
  const now = new Date();
  return {
    ...record,
    createdAt: now,
    doors: record.doors ?? null,
    engineAspiration: record.engineAspiration ?? null,
    engineDisplacement: record.engineDisplacement ?? null,
    fuelType: record.fuelType ?? null,
    id: `listing_${sequence}`,
    internalNotes: record.internalNotes ?? null,
    isVisibleOnPublicSite: record.isVisibleOnPublicSite ?? false,
    mileageKm: record.mileageKm ?? null,
    publicSlug: record.publicSlug ?? null,
    transmission: record.transmission ?? null,
    unitIds: [],
    updatedAt: now,
  };
}

export function createUnitRecord(
  record: CreateVehicleUnitRecord,
  sequence: number,
): VehicleUnit {
  const now = new Date();
  return {
    ...record,
    colorName: record.colorName ?? null,
    createdAt: now,
    id: `unit_${sequence}`,
    updatedAt: now,
  };
}

export function createMediaRecord(
  record: CreateVehicleMediaRecord,
  sequence: number,
): VehicleMedia {
  const now = new Date();
  return {
    ...record,
    createdAt: now,
    id: `media_${sequence}`,
    updatedAt: now,
  };
}

export function createDocumentRecord(
  record: CreateVehicleDocumentRecord,
  sequence: number,
): VehicleDocument {
  const now = new Date();
  return {
    ...record,
    createdAt: now,
    id: `document_${sequence}`,
    metadata: record.metadata ?? {},
    updatedAt: now,
    uploadedAt: now,
  };
}

export function saveMapValue<T extends { id: string }>(
  map: Map<string, T>,
  item: T,
): T {
  const updated = { ...item, updatedAt: new Date() };
  map.set(item.id, updated);
  return updated;
}

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

export function isScopedDocument(
  document: VehicleDocument,
  input: ListVehicleDocumentsInput,
) {
  const allowedTargetIds = [input.listingId, ...input.unitIds];
  return (
    allowedTargetIds.includes(document.targetId) &&
    document.storeId === input.storeId &&
    document.tenantId === input.tenantId
  );
}
