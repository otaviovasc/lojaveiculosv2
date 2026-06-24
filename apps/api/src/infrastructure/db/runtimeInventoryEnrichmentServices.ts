import {
  createInventoryEnrichmentServices,
  type InventoryEnrichmentServices,
} from "../../features/inventory/controllers/inventoryEnrichmentServices.js";
import {
  createDrizzleVehiclePlateLookupRepository,
  type DrizzleVehiclePlateLookupClient,
} from "./vehicleInventory/drizzleVehiclePlateLookupRepository.js";

export function createRuntimeInventoryEnrichmentServices(
  db: unknown,
  env: Record<string, string | undefined>,
): InventoryEnrichmentServices {
  return createInventoryEnrichmentServices({
    plateLookupCacheTtlMs: readPlateLookupCacheTtlMs(env),
    plateLookupRepository: createDrizzleVehiclePlateLookupRepository(
      db as DrizzleVehiclePlateLookupClient,
    ),
  });
}

function readPlateLookupCacheTtlMs(env: Record<string, string | undefined>) {
  const days = Number(env.API_PLACA_CACHE_TTL_DAYS ?? 30);
  return Number.isFinite(days) && days > 0
    ? days * 24 * 60 * 60 * 1000
    : 30 * 24 * 60 * 60 * 1000;
}
