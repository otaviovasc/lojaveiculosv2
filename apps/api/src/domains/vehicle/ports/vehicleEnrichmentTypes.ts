export type InventoryPlateMetadataItem = {
  label: string;
  value: string;
};

export type InventoryPlateFipeReference = {
  brandName: string | null;
  code: string | null;
  fuel: string | null;
  modelName: string | null;
  modelYear: number | null;
  priceCents: number | null;
  priceLabel: string | null;
  referenceMonth: string | null;
  score: number | null;
};

export type InventoryPlateVehicle = {
  aspiration: string | null;
  bodyType: string | null;
  brand: string | null;
  chassis: string | null;
  city: string | null;
  color: string | null;
  engine: string | null;
  fuel: string | null;
  manufactureYear: number | null;
  mileageKm: number | null;
  model: string | null;
  modelYear: number | null;
  origin: string | null;
  power: string | null;
  state: string | null;
  transmission: string | null;
  vehicleType: string | null;
  version: string | null;
};

export type InventoryPlateLookupResponse = {
  fipe: InventoryPlateFipeReference | null;
  metadata: readonly InventoryPlateMetadataItem[];
  plate: string;
  source: "apibrasil";
  vehicle: InventoryPlateVehicle;
};

export type InventoryResaleMarketSignal = {
  code:
    | "chinese_electrified_liquidity_context"
    | "chinese_new_vehicle_pressure"
    | "consignment_strategy_context"
    | "possible_rental_history"
    | "rental_fleet_supply_pressure";
  message: string;
  severity: "info" | "risk" | "watch";
  title: string;
};

export type InventoryResaleMarketContext = {
  priceBand: string | null;
  referenceDate: string;
  segment: string | null;
  signals: readonly InventoryResaleMarketSignal[];
};

export type InventoryResaleTopic = {
  code: "L" | "N" | "W";
  message: string;
  title: string;
  type: "negative" | "neutral" | "positive";
};

export type InventoryResaleAnalysisRequest = {
  acquisitionPriceCents: number | null;
  bodyType: string | null;
  brand: string | null;
  city: string | null;
  color: string | null;
  fipePriceCents: number | null;
  fuel: string | null;
  manufactureYear: number | null;
  marketContext: InventoryResaleMarketContext | null;
  metadata: readonly InventoryPlateMetadataItem[];
  mileageKm: number | null;
  model: string | null;
  modelYear: number | null;
  origin: string | null;
  plate: string | null;
  recommendedAcquisitionPriceCents: number | null;
  recommendedSellingPriceCents: number | null;
  sellingPriceCents: number | null;
  state: string | null;
  transmission: string | null;
  vehicleType: string | null;
  version: string | null;
};

export type InventoryResaleAnalysisResponse = {
  dealRiskScore: number;
  riskLevel: "high" | "low" | "medium";
  suggestedDescription: string;
  summary: string;
  topics: readonly InventoryResaleTopic[];
};
