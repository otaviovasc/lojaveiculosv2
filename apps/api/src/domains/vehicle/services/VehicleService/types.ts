import type { FinanceRepository } from "../../../finance/ports/financeRepository.js";
import type { DocumentRepository } from "../../../documents/ports/documentRepository.js";
import type {
  VehicleDocumentRepository,
  VehicleListingRepository,
  VehicleMediaRepository,
  VehicleUnitRepository,
} from "../../ports/vehicleInventoryRepository.js";
import type { VehicleCatalogProvider } from "../../ports/vehicleCatalogProvider.js";
import type { VehicleCatalogRepository } from "../../ports/vehicleCatalogRepository.js";
import type { VehicleChecklistRepository } from "../../ports/vehicleChecklistRepository.js";
import type { VehicleMediaStorage } from "../../ports/vehicleMediaStorage.js";
import type { VehicleOperationsRepository } from "../../ports/vehicleOperationsRepository.js";
import type { VehicleSalesRepository } from "../../ports/vehicleSalesRepository.js";
import type { VehicleAcquisitionRepository } from "../../ports/vehicleAcquisitionRepository.js";
import type { VehicleStoreBrandingReader } from "../../ports/vehicleStoreBrandingReader.js";

export type VehicleInventoryServicePorts = {
  acquisitionRepository?: VehicleAcquisitionRepository;
  catalogProvider?: VehicleCatalogProvider;
  catalogRepository?: VehicleCatalogRepository;
  checklistRepository?: VehicleChecklistRepository;
  documentRepository?: VehicleDocumentRepository;
  documentTemplateRepository?: Pick<DocumentRepository, "findTemplate">;
  financeRepository?: FinanceRepository;
  listingRepository: VehicleListingRepository;
  mediaRepository?: VehicleMediaRepository;
  mediaStorage?: VehicleMediaStorage;
  operationsRepository?: VehicleOperationsRepository;
  salesRepository?: VehicleSalesRepository;
  unitRepository?: VehicleUnitRepository;
  storeBrandingReader?: VehicleStoreBrandingReader;
};
