import type {
  VehicleCatalogProvider,
  VehicleCatalogType,
} from "../../ports/vehicleCatalogProvider.js";
import type { VehicleCatalogRepository } from "../../ports/vehicleCatalogRepository.js";
import type { VehicleInventoryServicePorts } from "../VehicleService/serviceSupport.js";
export { deriveModelFamilyName } from "../../catalog/catalogNameNormalization.js";

export const vehicleCatalogPermission = "inventory.read";
export const vehicleCatalogSyncPermission = "inventory.catalog_sync";

export type VehicleCatalogServicePorts = Pick<
  VehicleInventoryServicePorts,
  "catalogProvider" | "catalogRepository"
>;

export class VehicleCatalogProviderError extends Error {
  constructor() {
    super("Vehicle catalog provider port is not configured.");
    this.name = "VehicleCatalogProviderError";
  }
}

export class VehicleCatalogRepositoryError extends Error {
  constructor() {
    super("Vehicle catalog repository port is not configured.");
    this.name = "VehicleCatalogRepositoryError";
  }
}

export function getCatalogProvider(
  ports: VehicleCatalogServicePorts | undefined,
): VehicleCatalogProvider {
  if (ports?.catalogProvider) return ports.catalogProvider;
  throw new VehicleCatalogProviderError();
}

export function getCatalogRepository(
  ports: VehicleCatalogServicePorts | undefined,
): VehicleCatalogRepository {
  if (ports?.catalogRepository) return ports.catalogRepository;
  throw new VehicleCatalogRepositoryError();
}

export function normalizeVehicleType(
  vehicleType: VehicleCatalogType | undefined,
): VehicleCatalogType {
  return vehicleType ?? "cars";
}
