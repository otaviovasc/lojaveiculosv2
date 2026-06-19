import { vi } from "vitest";
import type { TestFinanceRepository } from "../finance/testSupportFinanceRepository.js";
import { createTestFinanceRepository } from "../finance/testSupportFinanceRepository.js";
import type {
  CreateVehicleDocumentRecord,
  CreateVehicleListingRecord,
  CreateVehicleMediaRecord,
  CreateVehicleUnitRecord,
  ListVehicleChildrenInput,
  ListVehicleDocumentsInput,
  VehicleDocument,
  VehicleDocumentRepository,
  VehicleMedia,
  VehicleListing,
  VehicleListingRepository,
  VehicleMediaRepository,
  VehicleUnit,
  VehicleUnitRepository,
} from "./ports/vehicleInventoryRepository.js";
import { createTestVehicleMediaStorage } from "./testSupportMediaStorage.js";
import { createTestOperationsRepository } from "./testSupportOperations.js";
import { createTestVehicleSalesRepository } from "./testSupportSalesRepository.js";
import type { VehicleInventoryServicePorts } from "./services/VehicleService/serviceSupport.js";
import { createListing, testNow } from "./testSupportVehicleServiceFixtures.js";

export type TestVehicleInventoryPorts = VehicleInventoryServicePorts & {
  documents: Map<string, VehicleDocument>;
  financeRepository: TestFinanceRepository;
  listings: Map<string, VehicleListing>;
  media: Map<string, VehicleMedia>;
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

  const listingRepository = createListingRepository(
    listings,
    () => listingSequence++,
  );

  return {
    documentRepository: createDocumentRepository(
      documents,
      () => documentSequence++,
    ),
    documents,
    financeRepository: createTestFinanceRepository(),
    listingRepository,
    listings,
    media,
    mediaRepository: createMediaRepository(media, () => mediaSequence++),
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
        id: `listing_${nextSequence()}`,
        unitIds: [],
      });
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
    list: vi.fn(async ({ limit, search, status, storeId, tenantId }) =>
      [...listings.values()]
        .filter((listing) => listing.storeId === storeId)
        .filter((listing) => listing.tenantId === tenantId)
        .filter((listing) => !status || listing.status === status)
        .filter((listing) => matchesSearch(listing, search))
        .slice(0, limit),
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
      const unit: VehicleUnit = {
        ...record,
        createdAt: testNow,
        id: `unit_${nextSequence()}`,
        updatedAt: testNow,
      };
      units.set(unit.id, unit);
      return unit;
    }),
    findById: vi.fn(async ({ listingId, storeId, tenantId, unitId }) => {
      const unit = units.get(unitId);
      if (!unit) return null;
      if (unit.listingId !== listingId) return null;
      if (unit.storeId !== storeId || unit.tenantId !== tenantId) return null;
      return unit;
    }),
    listByListingIds: vi.fn(async (input: ListVehicleChildrenInput) =>
      [...units.values()].filter((unit) => isScopedChild(unit, input)),
    ),
    save: vi.fn(async (unit: VehicleUnit) => {
      const updated = { ...unit, updatedAt: new Date() };
      units.set(unit.id, updated);
      return updated;
    }),
  };
}

function createMediaRepository(
  media: Map<string, VehicleMedia>,
  nextSequence: () => number,
): VehicleMediaRepository {
  return {
    create: vi.fn(async (record: CreateVehicleMediaRecord) => {
      const item: VehicleMedia = {
        ...record,
        createdAt: testNow,
        id: `media_${nextSequence()}`,
        updatedAt: testNow,
      };
      media.set(item.id, item);
      return item;
    }),
    delete: vi.fn(async (item: VehicleMedia) => {
      media.delete(item.id);
      return { ...item, updatedAt: new Date() };
    }),
    findById: vi.fn(async ({ listingId, mediaId, storeId, tenantId }) => {
      const item = media.get(mediaId);
      if (!item) return null;
      if (item.listingId !== listingId) return null;
      if (item.storeId !== storeId || item.tenantId !== tenantId) return null;
      return item;
    }),
    listByListingIds: vi.fn(async (input: ListVehicleChildrenInput) =>
      [...media.values()].filter((item) => isScopedChild(item, input)),
    ),
    save: vi.fn(async (item: VehicleMedia) => {
      const updated = { ...item, updatedAt: new Date() };
      media.set(item.id, updated);
      return updated;
    }),
  };
}

function createDocumentRepository(
  documents: Map<string, VehicleDocument>,
  nextSequence: () => number,
): VehicleDocumentRepository {
  return {
    create: vi.fn(async (record: CreateVehicleDocumentRecord) => {
      const document: VehicleDocument = {
        ...record,
        createdAt: testNow,
        id: `document_${nextSequence()}`,
        metadata: record.metadata ?? {},
        updatedAt: testNow,
        uploadedAt: testNow,
      };
      documents.set(document.id, document);
      return document;
    }),
    listByListing: vi.fn(async (input: ListVehicleDocumentsInput) =>
      [...documents.values()].filter((document) =>
        isScopedDocument(document, input),
      ),
    ),
  };
}

function isScopedDocument(
  document: VehicleDocument,
  input: ListVehicleDocumentsInput,
) {
  return (
    [input.listingId, ...input.unitIds].includes(document.targetId) &&
    document.storeId === input.storeId &&
    document.tenantId === input.tenantId
  );
}

function matchesSearch(
  listing: VehicleListing,
  search: string | null,
): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();

  return [listing.title, listing.plate, listing.description]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(normalized));
}

function isScopedChild(
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
