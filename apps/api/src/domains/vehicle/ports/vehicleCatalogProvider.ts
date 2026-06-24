export type VehicleCatalogType = "cars" | "motorcycles" | "trucks";

export type VehicleCatalogOption = {
  code: string;
  imageUrl?: string | null;
  name: string;
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

export type VehicleCatalogProvider = {
  getVehicle: (input: {
    brandCode: string;
    modelCode: string;
    vehicleType: VehicleCatalogType;
    yearCode: string;
  }) => Promise<VehicleCatalogSnapshot>;
  listBrands: (input: {
    vehicleType: VehicleCatalogType;
  }) => Promise<readonly VehicleCatalogOption[]>;
  listModels: (input: {
    brandCode: string;
    vehicleType: VehicleCatalogType;
  }) => Promise<readonly VehicleCatalogOption[]>;
  listYears: (input: {
    brandCode: string;
    modelCode: string;
    vehicleType: VehicleCatalogType;
  }) => Promise<readonly VehicleCatalogYearOption[]>;
};
