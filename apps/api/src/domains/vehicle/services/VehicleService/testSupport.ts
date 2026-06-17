import { vi } from "vitest";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CreateVehicleListingRecord,
  CreateVehicleUnitRecord,
  VehicleListing,
  VehicleListingRepository,
  VehicleUnit,
  VehicleUnitRepository,
} from "../../ports/vehicleInventoryRepository.js";
import type { VehicleInventoryServicePorts } from "./serviceSupport.js";

const now = new Date("2026-01-01T00:00:00.000Z");

export function createContext(permissions: string[]): ServiceContext {
  return {
    actor: { id: "user_1", kind: "user" },
    audit: { record: vi.fn(async () => undefined) },
    logger: {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    },
    permissions: [...permissions],
    requestId: "req_1",
    storeId: "store_1",
    tenantId: "tenant_1",
  };
}

export function createListing(
  input: Partial<VehicleListing> = {},
): VehicleListing {
  return {
    createdAt: now,
    description: null,
    id: "listing_1",
    plate: "ABC1D23",
    priceCents: 9500000,
    status: "draft",
    storeId: "store_1",
    tenantId: "tenant_1",
    title: "Vehicle",
    unitIds: [],
    updatedAt: now,
    ...input,
  };
}

export function createInMemoryVehiclePorts(
  seed: readonly VehicleListing[] = [],
): VehicleInventoryServicePorts & {
  listings: Map<string, VehicleListing>;
  units: Map<string, VehicleUnit>;
} {
  const listings = new Map(seed.map((listing) => [listing.id, listing]));
  const units = new Map<string, VehicleUnit>();
  let listingSequence = listings.size + 1;
  let unitSequence = 1;

  const listingRepository: VehicleListingRepository = {
    create: vi.fn(async (record: CreateVehicleListingRecord) => {
      const listing = createListing({
        ...record,
        id: `listing_${listingSequence}`,
        unitIds: [],
      });
      listingSequence += 1;
      listings.set(listing.id, listing);
      return listing;
    }),
    findById: vi.fn(async ({ listingId, storeId, tenantId }) => {
      const listing = listings.get(listingId);
      if (!listing) return null;
      if (listing.storeId !== storeId || listing.tenantId !== tenantId) {
        return null;
      }
      return listing;
    }),
    save: vi.fn(async (listing: VehicleListing) => {
      listings.set(listing.id, listing);
      return listing;
    }),
  };

  const unitRepository: VehicleUnitRepository = {
    create: vi.fn(async (record: CreateVehicleUnitRecord) => {
      const unit: VehicleUnit = {
        ...record,
        createdAt: now,
        id: `unit_${unitSequence}`,
      };
      unitSequence += 1;
      units.set(unit.id, unit);
      return unit;
    }),
  };

  return {
    listingRepository,
    listings,
    unitRepository,
    units,
  };
}
