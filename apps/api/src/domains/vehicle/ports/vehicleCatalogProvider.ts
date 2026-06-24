export type VehicleCatalogType = "cars" | "motorcycles" | "trucks";

export type VehicleCatalogOption = {
  code: string;
  imageUrl?: string | null;
  name: string;
};

export type VehicleCatalogReference = {
  code: string;
  month: string;
};

export type VehicleCatalogYearOption = VehicleCatalogOption & {
  fuelCode: string | null;
  modelYear: number | null;
};

export type VehicleCatalogSnapshot = {
  brandCode: string;
  brandLogoUrl?: string | null;
  brandName: string;
  fipeCode: string | null;
  fuel: string | null;
  modelCode: string;
  modelName: string;
  modelYear: number | null;
  priceCents: number | null;
  referenceMonth: string | null;
  source: "fipe";
  vehicleType: VehicleCatalogType;
  yearCode: string;
  yearName: string;
};

export type VehicleCatalogFipeCodeDetails = {
  brandName: string | null;
  fipeCode: string;
  fuel: string | null;
  fuelAcronym: string | null;
  modelName: string | null;
  modelYear: number | null;
  priceCents: number | null;
  priceLabel: string | null;
  referenceMonth: string | null;
  source: "fipe";
  vehicleType: VehicleCatalogType;
  yearCode: string;
};

export type VehicleCatalogPriceHistoryEntry = {
  priceCents: number | null;
  priceLabel: string | null;
  referenceCode: string;
  referenceMonth: string;
};

export type VehicleCatalogPriceHistory = {
  brandName: string | null;
  fipeCode: string;
  fuel: string | null;
  modelName: string | null;
  modelYear: number | null;
  source: "fipe";
  vehicleType: VehicleCatalogType;
  yearCode: string;
  entries: readonly VehicleCatalogPriceHistoryEntry[];
};

export type VehicleCatalogProvider = {
  getVehicle: (input: {
    brandCode: string;
    modelCode: string;
    referenceCode?: string | undefined;
    vehicleType: VehicleCatalogType;
    yearCode: string;
  }) => Promise<VehicleCatalogSnapshot>;
  getVehicleByFipeCode: (input: {
    fipeCode: string;
    referenceCode?: string | undefined;
    vehicleType: VehicleCatalogType;
    yearCode: string;
  }) => Promise<VehicleCatalogFipeCodeDetails>;
  getVehicleHistory: (input: {
    fipeCode: string;
    referenceCode?: string | undefined;
    vehicleType: VehicleCatalogType;
    yearCode: string;
  }) => Promise<VehicleCatalogPriceHistory>;
  listReferences: () => Promise<readonly VehicleCatalogReference[]>;
  listBrands: (input: {
    referenceCode?: string | undefined;
    vehicleType: VehicleCatalogType;
  }) => Promise<readonly VehicleCatalogOption[]>;
  listModels: (input: {
    brandCode: string;
    referenceCode?: string | undefined;
    vehicleType: VehicleCatalogType;
  }) => Promise<readonly VehicleCatalogOption[]>;
  listYears: (input: {
    brandCode: string;
    modelCode: string;
    referenceCode?: string | undefined;
    vehicleType: VehicleCatalogType;
  }) => Promise<readonly VehicleCatalogYearOption[]>;
  listYearsByFipeCode: (input: {
    fipeCode: string;
    referenceCode?: string | undefined;
    vehicleType: VehicleCatalogType;
  }) => Promise<readonly VehicleCatalogYearOption[]>;
};
