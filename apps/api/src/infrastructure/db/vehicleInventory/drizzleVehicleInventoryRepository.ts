import { and, eq, isNull } from "drizzle-orm";
import { vehicleListings } from "@lojaveiculosv2/db";
import type { DrizzleRepositoryClient } from "../drizzleClient.js";
import type {
  VehicleListingRepository,
  VehicleMediaRepository,
  VehicleDocumentRepository,
  VehicleUnitRepository,
} from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";
import type { VehicleChecklistRepository } from "../../../domains/vehicle/ports/vehicleChecklistRepository.js";
import type { VehicleAcquisitionRepository } from "../../../domains/vehicle/ports/vehicleAcquisitionRepository.js";
import type { VehicleOperationsRepository } from "../../../domains/vehicle/ports/vehicleOperationsRepository.js";
import type { VehicleSalesRepository } from "../../../domains/vehicle/ports/vehicleSalesRepository.js";
import type { FinanceRepository } from "../../../domains/finance/ports/financeRepository.js";
import {
  createDrizzleFinanceRepository,
  type DrizzleFinanceClient,
} from "../finance/drizzleFinanceRepository.js";
import {
  createListingMetadata,
  requireReturnedRow,
  toDbListingStatus,
  toVehicleListing,
  type InsertVehicleListingRow,
  type UpdateVehicleListingRow,
  type VehicleListingRow,
} from "./drizzleVehicleInventoryMappers.js";
import {
  isVehicleInventoryUuid,
  requireDbScope,
} from "./drizzleVehicleInventoryScope.js";
import {
  findListingByPublicSlug,
  findListingUnits,
  findListingsUnits,
  matchesListingFilters,
} from "./drizzleVehicleInventoryReads.js";
import {
  createDrizzleVehicleMediaRepository,
  createDrizzleVehicleUnitRepository,
  type DrizzleVehicleMediaClient,
  type DrizzleVehicleUnitClient,
} from "./drizzleVehicleInventoryWriteRepositories.js";
import {
  createDrizzleVehicleDocumentRepository,
  type DrizzleVehicleDocumentClient,
} from "./drizzleVehicleDocumentRepository.js";
import {
  createDrizzleVehicleChecklistRepository,
  type DrizzleVehicleChecklistClient,
} from "./drizzleVehicleChecklistRepository.js";
import {
  createDrizzleVehicleOperationsRepository,
  type DrizzleVehicleOperationsClient,
} from "./drizzleVehicleOperationsRepository.js";
import {
  createDrizzleVehicleSalesRepository,
  type DrizzleVehicleSalesClient,
} from "./drizzleVehicleSalesRepository.js";
import {
  createDrizzleVehicleAcquisitionRepository,
  type DrizzleVehicleAcquisitionClient,
} from "./drizzleVehicleAcquisitionRepository.js";

type DrizzleVehicleListingClient = DrizzleRepositoryClient<
  VehicleListingRow,
  InsertVehicleListingRow,
  UpdateVehicleListingRow
>;
export type DrizzleVehicleInventoryClient = DrizzleVehicleListingClient &
  DrizzleVehicleDocumentClient &
  DrizzleFinanceClient &
  DrizzleVehicleOperationsClient &
  DrizzleVehicleSalesClient &
  DrizzleVehicleChecklistClient &
  DrizzleVehicleAcquisitionClient &
  DrizzleVehicleMediaClient &
  DrizzleVehicleUnitClient;

export function createDrizzleVehicleInventoryRepositories(
  db: DrizzleVehicleInventoryClient,
): {
  acquisitionRepository: VehicleAcquisitionRepository;
  listingRepository: VehicleListingRepository;
  mediaRepository: VehicleMediaRepository;
  checklistRepository: VehicleChecklistRepository;
  financeRepository: FinanceRepository;
  operationsRepository: VehicleOperationsRepository;
  salesRepository: VehicleSalesRepository;
  unitRepository: VehicleUnitRepository;
  documentRepository: VehicleDocumentRepository;
} {
  const acquisitionRepository = createDrizzleVehicleAcquisitionRepository(db);
  const listingRepository = createDrizzleVehicleListingRepository(db);
  const checklistRepository = createDrizzleVehicleChecklistRepository(db);
  const documentRepository = createDrizzleVehicleDocumentRepository(db);
  const financeRepository = createDrizzleFinanceRepository(db);
  const mediaRepository = createDrizzleVehicleMediaRepository(db);
  const operationsRepository = createDrizzleVehicleOperationsRepository(db);
  const salesRepository = createDrizzleVehicleSalesRepository(db);
  const unitRepository = createDrizzleVehicleUnitRepository(db);
  return {
    acquisitionRepository,
    checklistRepository,
    documentRepository,
    financeRepository,
    listingRepository,
    mediaRepository,
    operationsRepository,
    salesRepository,
    unitRepository,
  };
}

export function createDrizzleVehicleListingRepository(
  db: DrizzleVehicleInventoryClient,
): VehicleListingRepository {
  const listingDb = db as DrizzleVehicleListingClient;
  return {
    async create(record) {
      const scope = requireDbScope(record);
      const [row] = await listingDb
        .insert(vehicleListings)
        .values({
          askingPriceCents: record.priceCents,
          description: record.description,
          doors: record.doors ?? null,
          engineAspiration: record.engineAspiration ?? null,
          engineDisplacement: record.engineDisplacement ?? null,
          fuelType: record.fuelType ?? null,
          internalNotes: record.internalNotes ?? null,
          isVisibleOnPublicSite: record.isVisibleOnPublicSite ?? false,
          manufactureYear: record.manufactureYear,
          metadata: createListingMetadata(record.catalog),
          mileageKm: record.mileageKm ?? null,
          modelYear: record.modelYear,
          publicSlug: record.publicSlug ?? null,
          status: toDbListingStatus(record.status),
          storeId: scope.storeId,
          tenantId: scope.tenantId,
          title: record.title,
          transmission: record.transmission ?? null,
          trimName: record.trimName,
        })
        .returning();

      return toVehicleListing(
        requireReturnedRow(row, "vehicle listing create"),
        [],
      );
    },

    async findById(input) {
      const scope = requireDbScope(input);
      if (!isVehicleInventoryUuid(input.listingId)) return null;
      const [row] = await listingDb
        .select()
        .from(vehicleListings)
        .where(
          and(
            eq(vehicleListings.id, input.listingId),
            eq(vehicleListings.storeId, scope.storeId),
            eq(vehicleListings.tenantId, scope.tenantId),
            eq(vehicleListings.isDeleted, false),
            isNull(vehicleListings.deletedAt),
          ),
        );

      if (!row) return null;

      const units = await findListingUnits(db, row.id);
      return toVehicleListing(row, units);
    },
    findByPublicSlug: (input) => findListingByPublicSlug(db, input),
    async list(input) {
      const scope = requireDbScope(input);
      const rows = await listingDb
        .select()
        .from(vehicleListings)
        .where(
          and(
            eq(vehicleListings.storeId, scope.storeId),
            eq(vehicleListings.tenantId, scope.tenantId),
            eq(vehicleListings.isDeleted, false),
            isNull(vehicleListings.deletedAt),
          ),
        );
      const units = await findListingsUnits(
        db,
        rows.map((row) => row.id),
      );

      return rows
        .map((row) =>
          toVehicleListing(
            row,
            units.filter((unit) => unit.listingId === row.id),
          ),
        )
        .filter((listing) => matchesListingFilters(listing, input))
        .sort(
          (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
        )
        .slice(input.offset, input.offset + input.limit);
    },

    async save(listing) {
      const scope = requireDbScope(listing);
      const [row] = await listingDb
        .update(vehicleListings)
        .set({
          askingPriceCents: listing.priceCents,
          description: listing.description,
          doors: listing.doors,
          engineAspiration: listing.engineAspiration,
          engineDisplacement: listing.engineDisplacement,
          fuelType: listing.fuelType,
          internalNotes: listing.internalNotes,
          isVisibleOnPublicSite: listing.isVisibleOnPublicSite,
          manufactureYear: listing.manufactureYear,
          metadata: createListingMetadata(listing.catalog),
          mileageKm: listing.mileageKm,
          modelYear: listing.modelYear,
          publicSlug: listing.publicSlug,
          status: toDbListingStatus(listing.status),
          title: listing.title,
          transmission: listing.transmission,
          trimName: listing.trimName,
          updatedAt: listing.updatedAt,
        })
        .where(
          and(
            eq(vehicleListings.id, listing.id),
            eq(vehicleListings.storeId, scope.storeId),
            eq(vehicleListings.tenantId, scope.tenantId),
            eq(vehicleListings.isDeleted, false),
            isNull(vehicleListings.deletedAt),
          ),
        )
        .returning();

      return toVehicleListing(
        requireReturnedRow(row, `vehicle listing save ${listing.id}`),
        await findListingUnits(db, listing.id),
      );
    },
  };
}
