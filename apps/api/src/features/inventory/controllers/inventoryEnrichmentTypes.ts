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

export type InventoryResaleTopic = {
  code: "L" | "W";
  message: string;
  title: string;
  type: "negative" | "positive";
};

export type InventoryResaleAnalysisRequest = {
  acquisitionPriceCents: number | null;
  brand: string | null;
  color: string | null;
  fipePriceCents: number | null;
  fuel: string | null;
  manufactureYear: number | null;
  metadata: readonly InventoryPlateMetadataItem[];
  mileageKm: number | null;
  model: string | null;
  modelYear: number | null;
  plate: string | null;
  recommendedAcquisitionPriceCents: number | null;
  recommendedSellingPriceCents: number | null;
  sellingPriceCents: number | null;
  transmission: string | null;
  version: string | null;
};

export type InventoryResaleAnalysisResponse = {
  riskLevel: "high" | "low" | "medium";
  suggestedDescription: string;
  summary: string;
  topics: readonly InventoryResaleTopic[];
};
