import type {
  CreateVehicleListingRecord,
  CreateVehicleUnitRecord,
  VehicleListing,
  VehicleListingRepository,
  VehicleUnit,
  VehicleUnitRepository,
} from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";
import type { VehicleInventoryServicePorts } from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";

export function createMemoryVehicleInventoryPorts(): VehicleInventoryServicePorts {
  const listings = new Map<string, VehicleListing>();
  const units = new Map<string, VehicleUnit>();
  let listingSequence = 1;
  let unitSequence = 1;

  const listingRepository: VehicleListingRepository = {
    create: async (record) => {
      const listing = createListingRecord(record, listingSequence);
      listingSequence += 1;
      listings.set(listing.id, listing);
      return listing;
    },
    findById: async ({ listingId, storeId, tenantId }) => {
      const listing = listings.get(listingId);
      if (!listing) return null;
      if (listing.storeId !== storeId || listing.tenantId !== tenantId) {
        return null;
      }
      return listing;
    },
    save: async (listing) => {
      listings.set(listing.id, listing);
      return listing;
    },
  };

  const unitRepository: VehicleUnitRepository = {
    create: async (record) => {
      const unit = createUnitRecord(record, unitSequence);
      unitSequence += 1;
      units.set(unit.id, unit);
      return unit;
    },
  };

  return { listingRepository, unitRepository };
}

function createListingRecord(
  record: CreateVehicleListingRecord,
  sequence: number,
): VehicleListing {
  const now = new Date();
  return {
    ...record,
    createdAt: now,
    id: `listing_${sequence}`,
    unitIds: [],
    updatedAt: now,
  };
}

function createUnitRecord(
  record: CreateVehicleUnitRecord,
  sequence: number,
): VehicleUnit {
  return {
    ...record,
    createdAt: new Date(),
    id: `unit_${sequence}`,
  };
}
