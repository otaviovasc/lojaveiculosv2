import type {
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
import { appendVehicleDocumentVoidHistory } from "../../../../domains/vehicle/documents/vehicleWorkflowDocuments.js";
import { createMemoryFinanceRepository } from "./financeRepository.js";
import { createMemoryVehicleCatalogProvider } from "./vehicleCatalogProvider.js";
import { createMemoryVehicleCatalogRepository } from "./vehicleCatalogRepository.js";
import { createMemoryVehicleChecklistRepository } from "./vehicleChecklistRepository.js";
import { createMemoryVehicleMediaStorage } from "./vehicleMediaStorage.js";
import { createMemoryVehicleOperationsRepository } from "./vehicleOperationsRepository.js";
import { createMemoryVehicleSalesRepository } from "./vehicleSalesRepository.js";
import { createMemoryVehicleAcquisitionRepository } from "./vehicleAcquisitionRepository.js";
import {
  createDocumentRecord,
  createListingRecord,
  createMediaRecord,
  createUnitRecord,
  isScopedDocument,
  matchesSearch,
  saveMapValue,
} from "./vehicleInventoryRecords.js";

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
    delete: async (listing) => {
      listings.delete(listing.id);
      return { ...listing, updatedAt: new Date() };
    },
    findById: async ({ listingId, storeId, tenantId }) => {
      const listing = listings.get(listingId);
      if (!listing) return null;
      if (listing.storeId !== storeId || listing.tenantId !== tenantId) {
        return null;
      }
      return listing;
    },
    findByPublicSlug: async ({ publicSlug, storeId, tenantId }) =>
      [...listings.values()].find(
        (listing) =>
          listing.publicSlug === publicSlug &&
          listing.storeId === storeId &&
          listing.tenantId === tenantId,
      ) ?? null,
    list: async ({ limit, offset, search, status, storeId, tenantId }) =>
      [...listings.values()]
        .filter((listing) => listing.storeId === storeId)
        .filter((listing) => listing.tenantId === tenantId)
        .filter((listing) => !status || listing.status === status)
        .filter((listing) => matchesSearch(listing, search))
        .slice(offset, offset + limit),
    lockForStockTransition: async ({ listingId, storeId, tenantId }) => {
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
    delete: async (unit) => {
      units.delete(unit.id);
      return { ...unit, updatedAt: new Date() };
    },
    findById: async ({ listingId, storeId, tenantId, unitId }) => {
      const unit = units.get(unitId);
      if (!unit) return null;
      if (listingId && unit.listingId !== listingId) return null;
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
    list: async ({ limit, offset, status, storeId, tenantId }) =>
      [...units.values()]
        .filter((unit) => unit.storeId === storeId)
        .filter((unit) => unit.tenantId === tenantId)
        .filter((unit) => !status || unit.status === status)
        .slice(offset, offset + limit),
    save: async (unit) => saveMapValue(units, unit),
    saveIfStatus: async (unit, expectedStatus) => {
      const current = units.get(unit.id);
      if (!current || current.status !== expectedStatus) return null;
      return saveMapValue(units, unit);
    },
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
    findById: async ({ mediaId, storeId, tenantId, unitId }) => {
      const item = media.get(mediaId);
      if (!item) return null;
      if (item.unitId !== unitId) return null;
      if (item.storeId !== storeId || item.tenantId !== tenantId) return null;
      return item;
    },
    listByListingIds: async ({ listingIds, storeId, tenantId }) =>
      [...media.values()].filter((item) => {
        const unit = units.get(item.unitId);
        return (
          unit &&
          listingIds.includes(unit.listingId) &&
          item.storeId === storeId &&
          item.tenantId === tenantId
        );
      }),
    listByUnitIds: async ({ storeId, tenantId, unitIds }) =>
      [...media.values()].filter(
        (item) =>
          unitIds.includes(item.unitId) &&
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
    voidBySale: async (input) => {
      const matched = [...documents.values()].filter(
        (document) =>
          document.storeId === input.storeId &&
          document.tenantId === input.tenantId &&
          document.targetId === input.unitId &&
          document.metadata.saleId === input.saleId,
      );
      return matched.map((document) => {
        if (document.status === "voided") return document;
        const updated = {
          ...document,
          metadata: appendVehicleDocumentVoidHistory(document.metadata, input),
          status: "voided" as const,
          updatedAt: input.at,
        };
        documents.set(document.id, updated);
        return updated;
      });
    },
  };

  const operationsRepository = createMemoryVehicleOperationsRepository();

  return {
    acquisitionRepository: createMemoryVehicleAcquisitionRepository(),
    auditRepository: { listByEntityIds: async () => [] },
    catalogProvider: createMemoryVehicleCatalogProvider(),
    catalogRepository: createMemoryVehicleCatalogRepository(),
    checklistRepository: createMemoryVehicleChecklistRepository(),
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
