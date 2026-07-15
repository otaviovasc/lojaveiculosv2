import type {
  InventoryResaleAnalysisRequest,
  InventoryResaleAnalysisResponse,
} from "./vehicleEnrichmentTypes.js";

export type VehicleResaleAnalysisProvider = {
  analyze: (
    input: InventoryResaleAnalysisRequest,
  ) => Promise<InventoryResaleAnalysisResponse>;
  model: string;
  name: string;
};
