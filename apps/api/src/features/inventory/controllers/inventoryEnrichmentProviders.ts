import { createApiBrasilVehiclePlateProvider } from "../../../infrastructure/vehicleEnrichment/apiBrasilVehiclePlateProvider.js";
import { createOpenRouterVehicleAnalysisProvider } from "../../../infrastructure/vehicleEnrichment/openRouterVehicleAnalysisProvider.js";
import { resolveOpenRouterConfig } from "../../../infrastructure/openRouterConfig.js";

export function createDefaultInventoryAnalysisProvider() {
  return createOpenRouterVehicleAnalysisProvider(
    resolveOpenRouterConfig(process.env, "inventory_resale"),
  );
}

export function createDefaultInventoryPlateProvider() {
  return createApiBrasilVehiclePlateProvider({
    ...(process.env.API_PLACA_BASE_URL
      ? { baseUrl: process.env.API_PLACA_BASE_URL }
      : {}),
    ...(process.env.API_PLACA_DADOS_PATH
      ? { dadosPath: process.env.API_PLACA_DADOS_PATH }
      : {}),
    token: process.env.API_PLACA_KEY,
  });
}
