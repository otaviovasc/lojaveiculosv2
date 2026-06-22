import type {
  CreateVehicleListingRecord,
  CreateVehicleDocumentRecord,
  CreateVehicleMediaRecord,
  CreateVehicleUnitRecord,
  ListVehicleDocumentsInput,
  VehicleDocument,
  VehicleDocumentRepository,
  VehicleMedia,
  VehicleListing,
  VehicleListingRepository,
  VehicleMediaRepository,
  VehicleUnit,
  VehicleUnitRepository,
} from "../../../../domains/vehicle/ports/vehicleInventoryRepository.js";
import type { VehicleInventoryServicePorts } from "../../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import { createMemoryFinanceRepository } from "./financeRepository.js";
import { createMemoryVehicleCatalogProvider } from "./vehicleCatalogProvider.js";
import { createMemoryVehicleCatalogRepository } from "./vehicleCatalogRepository.js";
import { createMemoryVehicleMediaStorage } from "./vehicleMediaStorage.js";
import { createMemoryVehicleOperationsRepository } from "./vehicleOperationsRepository.js";
import { createMemoryVehicleSalesRepository } from "./vehicleSalesRepository.js";

export function createMemoryVehicleInventoryPorts(): VehicleInventoryServicePorts {
  const listings = new Map<string, VehicleListing>();
  const documents = new Map<string, VehicleDocument>();
  const media = new Map<string, VehicleMedia>();
  const units = new Map<string, VehicleUnit>();
  let documentSequence = 1;
  let listingSequence = 1;
  let mediaSequence = 1;
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
    list: async ({ limit, offset, search, status, storeId, tenantId }) =>
      [...listings.values()]
        .filter((listing) => listing.storeId === storeId)
        .filter((listing) => listing.tenantId === tenantId)
        .filter((listing) => !status || listing.status === status)
        .filter((listing) => matchesSearch(listing, search))
        .slice(offset, offset + limit),
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
    findById: async ({ listingId, storeId, tenantId, unitId }) => {
      const unit = units.get(unitId);
      if (!unit) return null;
      if (unit.listingId !== listingId) return null;
      if (unit.storeId !== storeId || unit.tenantId !== tenantId) return null;
      return unit;
    },
    listByListingIds: async ({ listingIds, storeId, tenantId }) =>
      [...units.values()].filter(
        (unit) =>
          listingIds.includes(unit.listingId) &&
          unit.storeId === storeId &&
          unit.tenantId === tenantId,
      ),
    save: async (unit) => saveMapValue(units, unit),
  };

  const mediaRepository: VehicleMediaRepository = {
    create: async (record) => {
      const item = createMediaRecord(record, mediaSequence);
      mediaSequence += 1;
      media.set(item.id, item);
      return item;
    },
    delete: async (item) => {
      media.delete(item.id);
      return { ...item, updatedAt: new Date() };
    },
    findById: async ({ listingId, mediaId, storeId, tenantId }) => {
      const item = media.get(mediaId);
      if (!item) return null;
      if (item.listingId !== listingId) return null;
      if (item.storeId !== storeId || item.tenantId !== tenantId) return null;
      return item;
    },
    listByListingIds: async ({ listingIds, storeId, tenantId }) =>
      [...media.values()].filter(
        (item) =>
          listingIds.includes(item.listingId) &&
          item.storeId === storeId &&
          item.tenantId === tenantId,
      ),
    save: async (item) => saveMapValue(media, item),
  };

  const documentRepository: VehicleDocumentRepository = {
    create: async (record) => {
      const document = createDocumentRecord(record, documentSequence);
      documentSequence += 1;
      documents.set(document.id, document);
      return document;
    },
    listByListing: async (input) =>
      [...documents.values()].filter((document) =>
        isScopedDocument(document, input),
      ),
  };

  const operationsRepository = createMemoryVehicleOperationsRepository();

  return {
    catalogProvider: createMemoryVehicleCatalogProvider(),
    catalogRepository: createMemoryVehicleCatalogRepository(),
    documentRepository,
    financeRepository: createMemoryFinanceRepository(),
    listingRepository,
    mediaRepository,
    mediaStorage: createMemoryVehicleMediaStorage(),
    operationsRepository,
    salesRepository: createMemoryVehicleSalesRepository(),
    unitRepository,
  };
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
  const now = new Date();
  return {
    ...record,
    createdAt: now,
    id: `unit_${sequence}`,
    updatedAt: now,
  };
}

function createMediaRecord(
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

function createDocumentRecord(
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

function saveMapValue<T extends { id: string }>(
  map: Map<string, T>,
  item: T,
): T {
  const updated = { ...item, updatedAt: new Date() };
  map.set(item.id, updated);
  return updated;
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

function isScopedDocument(
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
