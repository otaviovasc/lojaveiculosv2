import { vi } from "vitest";
import {
  createTestFinanceRepository,
  type TestFinanceRepository,
} from "../finance/testSupportFinanceRepository.js";
import {
  createTestVehicleChecklistRepository,
  type TestVehicleChecklistRepository,
} from "./testSupportChecklists.js";
import type {
  CreateVehicleDocumentRecord,
  CreateVehicleListingRecord,
  CreateVehicleUnitRecord,
  ListVehicleChildrenInput,
  VehicleDocument,
  VehicleMedia,
  VehicleListing,
  VehicleListingRepository,
  VehicleUnit,
  VehicleUnitRepository,
} from "./ports/vehicleInventoryRepository.js";
import { createTestVehicleMediaStorage } from "./testSupportMediaStorage.js";
import { createTestOperationsRepository } from "./testSupportOperations.js";
import type { TestVehicleOperationsRepository } from "./testSupportOperations.js";
import {
  createTestVehicleSalesRepository,
  type TestVehicleSalesRepository,
} from "./testSupportSalesRepository.js";
import {
  createTestVehicleAcquisitionRepository,
  type TestVehicleAcquisitionRepository,
} from "./testSupportAcquisitionRepository.js";
import type { VehicleInventoryServicePorts } from "./services/VehicleService/serviceSupport.js";
import { createTestVehicleDocumentRepository } from "./testSupportVehicleDocumentRepository.js";
import { createListing, testNow } from "./testSupportVehicleServiceFixtures.js";
import {
  isScopedChild,
  matchesSearch,
} from "./testSupportVehicleInventoryPredicates.js";
import { createTestVehicleMediaRepository } from "./testSupportVehicleMediaRepository.js";

export type TestVehicleInventoryPorts = VehicleInventoryServicePorts & {
  acquisitionRepository: TestVehicleAcquisitionRepository;
  checklistRepository: TestVehicleChecklistRepository;
  documents: Map<string, VehicleDocument>;
  financeRepository: TestFinanceRepository;
  listings: Map<string, VehicleListing>;
  media: Map<string, VehicleMedia>;
  operationsRepository: TestVehicleOperationsRepository;
  salesRepository: TestVehicleSalesRepository;
  units: Map<string, VehicleUnit>;
};

export function createInMemoryVehiclePorts(
  seed: readonly VehicleListing[] = [],
): TestVehicleInventoryPorts {
  const listings = new Map(seed.map((listing) => [listing.id, listing]));
  const documents = new Map<string, VehicleDocument>();
  const media = new Map<string, VehicleMedia>();
  const units = new Map<string, VehicleUnit>();
  let listingSequence = listings.size + 1;
  let documentSequence = 1;
  let mediaSequence = 1;
  let unitSequence = 1;
  return {
    acquisitionRepository: createTestVehicleAcquisitionRepository(),
    documentRepository: createTestVehicleDocumentRepository(
      documents,
      () => documentSequence++,
    ),
    checklistRepository: createTestVehicleChecklistRepository(),
    documents,
    financeRepository: createTestFinanceRepository(),
    listingRepository: createListingRepository(
      listings,
      () => listingSequence++,
    ),
    listings,
    media,
    mediaRepository: createTestVehicleMediaRepository(
      media,
      units,
      () => mediaSequence++,
    ),
    mediaStorage: createTestVehicleMediaStorage(),
    operationsRepository: createTestOperationsRepository(),
    salesRepository: createTestVehicleSalesRepository(),
    unitRepository: createUnitRepository(units, () => unitSequence++),
    units,
  };
}

function createListingRepository(
  listings: Map<string, VehicleListing>,
  nextSequence: () => number,
): VehicleListingRepository {
  return {
    create: vi.fn(async (record: CreateVehicleListingRecord) => {
      const listing = createListing({
        ...record,
        engineAspiration: record.engineAspiration ?? null,
        id: `listing_${nextSequence()}`,
        unitIds: [],
      });
      listings.set(listing.id, listing);
      return listing;
    }),
    delete: vi.fn(async (listing: VehicleListing) => {
      const updated = { ...listing, updatedAt: new Date() };
      listings.delete(listing.id);
      return updated;
    }),
    findById: vi.fn(async ({ listingId, storeId, tenantId }) => {
      const listing = listings.get(listingId);
      if (!listing) return null;
      if (listing.storeId !== storeId || listing.tenantId !== tenantId) {
        return null;
      }
      return listing;
    }),
    findByPublicSlug: vi.fn(async ({ publicSlug, storeId, tenantId }) => {
      return (
        [...listings.values()].find(
          (listing) =>
            listing.publicSlug === publicSlug &&
            listing.storeId === storeId &&
            listing.tenantId === tenantId,
        ) ?? null
      );
    }),
    list: vi.fn(async ({ limit, offset, search, status, storeId, tenantId }) =>
      [...listings.values()]
        .filter((listing) => listing.storeId === storeId)
        .filter((listing) => listing.tenantId === tenantId)
        .filter((listing) => !status || listing.status === status)
        .filter((listing) => matchesSearch(listing, search))
        .slice(offset, offset + limit),
    ),
    save: vi.fn(async (listing: VehicleListing) => {
      listings.set(listing.id, listing);
      return listing;
    }),
  };
}

function createUnitRepository(
  units: Map<string, VehicleUnit>,
  nextSequence: () => number,
): VehicleUnitRepository {
  return {
    create: vi.fn(async (record: CreateVehicleUnitRecord) => {
      const id = nextUnitId(units, nextSequence);
      const unit: VehicleUnit = {
        ...record,
        colorName: record.colorName ?? null,
        createdAt: testNow,
        id,
        updatedAt: testNow,
      };
      units.set(unit.id, unit);
      return unit;
    }),
    delete: vi.fn(async (unit: VehicleUnit) => {
      const updated = { ...unit, updatedAt: new Date() };
      units.delete(unit.id);
      return updated;
    }),
    findById: vi.fn(async ({ listingId, storeId, tenantId, unitId }) => {
      const unit = units.get(unitId);
      if (!unit) return null;
      if (listingId && unit.listingId !== listingId) return null;
      if (unit.storeId !== storeId || unit.tenantId !== tenantId) return null;
      return unit;
    }),
    listByListingIds: vi.fn(async (input: ListVehicleChildrenInput) =>
      [...units.values()].filter((unit) => isScopedChild(unit, input)),
    ),
    list: vi.fn(async ({ limit, offset, status, storeId, tenantId }) =>
      [...units.values()]
        .filter((unit) => unit.storeId === storeId)
        .filter((unit) => unit.tenantId === tenantId)
        .filter((unit) => !status || unit.status === status)
        .slice(offset, offset + limit),
    ),
    save: vi.fn(async (unit: VehicleUnit) => {
      const updated = { ...unit, updatedAt: new Date() };
      units.set(unit.id, updated);
      return updated;
    }),
  };
}

function nextUnitId(
  units: Map<string, VehicleUnit>,
  nextSequence: () => number,
) {
  let id = `unit_${nextSequence()}`;
  while (units.has(id)) {
    id = `unit_${nextSequence()}`;
  }
  return id;
}
