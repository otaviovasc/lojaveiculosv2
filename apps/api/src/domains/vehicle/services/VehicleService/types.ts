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
import type { BillingQuotaGuard } from "../../../billing/ports/billingQuotaGuard.js";
import type { VehicleAuditRepository } from "../../ports/vehicleAuditRepository.js";
import type { VehicleResaleAnalysisProvider } from "../../ports/vehicleResaleAnalysisProvider.js";
import type { VehicleAiStudioProvider } from "../../ports/vehicleAiStudioProvider.js";

export type VehicleInventoryServicePorts = {
  acquisitionRepository?: VehicleAcquisitionRepository;
  auditRepository?: VehicleAuditRepository;
  aiStudioProvider?: VehicleAiStudioProvider;
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
  quotaGuard?: BillingQuotaGuard;
  resaleAnalysisProvider?: VehicleResaleAnalysisProvider;
  salesRepository?: VehicleSalesRepository;
  unitRepository?: VehicleUnitRepository;
  storeBrandingReader?: VehicleStoreBrandingReader;
};
