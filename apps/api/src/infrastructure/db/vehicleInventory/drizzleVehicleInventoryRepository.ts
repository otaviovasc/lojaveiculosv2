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
  createDrizzleVehicleMediaRepository,
  createDrizzleVehicleUnitRepository,
  type DrizzleVehicleMediaClient,
  type DrizzleVehicleUnitClient,
} from "./drizzleVehicleInventoryWriteRepositories.js";
import {
  createDrizzleVehicleListingRepository,
  type DrizzleVehicleListingClient,
} from "./drizzleVehicleListingRepository.js";
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
