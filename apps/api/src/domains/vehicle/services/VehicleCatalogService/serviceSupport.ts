import type {
  VehicleCatalogProvider,
  VehicleCatalogType,
} from "../../ports/vehicleCatalogProvider.js";
import type { VehicleCatalogRepository } from "../../ports/vehicleCatalogRepository.js";
import type { VehicleInventoryServicePorts } from "../VehicleService/serviceSupport.js";

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

export function deriveModelFamilyName(versionName: string): string {
  const clean = versionName.replace(/\s+/g, " ").trim();
  const split = clean.search(
    /\s(?:\d|16V|8V|T\.|TB|MPI|TSI|TDI|FLEX|DIESEL|HYBRID|ELETRICO|AUT\.|MEC\.)/i,
  );
  const family = split > 0 ? clean.slice(0, split).trim() : clean;
  return family || clean;
}
