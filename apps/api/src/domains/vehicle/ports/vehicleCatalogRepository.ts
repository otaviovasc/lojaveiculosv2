import type {
  VehicleCatalogOption,
  VehicleCatalogSnapshot,
  VehicleCatalogType,
  VehicleCatalogYearOption,
} from "./vehicleCatalogProvider.js";

export type VehicleCatalogVersionOption = VehicleCatalogOption & {
  modelFamilyCode: string;
  modelFamilyName: string;
};

export type VehicleCatalogSyncRun = {
  id: string;
  vehicleType: VehicleCatalogType;
};

export type VehicleCatalogSyncCounts = {
  brandsSeen: number;
  modelFamiliesSeen: number;
  versionsSeen: number;
  yearsSeen: number;
};

export type VehicleCatalogRepository = {
  createSyncRun: (input: {
    provider: "fipe";
    vehicleType: VehicleCatalogType;
  }) => Promise<VehicleCatalogSyncRun>;
  finishSyncRun: (input: {
    counts: VehicleCatalogSyncCounts;
    errorMessage?: string | null;
    metadata?: Record<string, unknown> | undefined;
    runId: string;
    status: "failed" | "succeeded";
  }) => Promise<void>;
  getSnapshot: (input: {
    brandCode: string;
    versionCode: string;
    vehicleType: VehicleCatalogType;
    yearCode: string;
  }) => Promise<VehicleCatalogSnapshot | null>;
  listBrands: (input: {
    vehicleType: VehicleCatalogType;
  }) => Promise<readonly VehicleCatalogOption[]>;
  listModelFamilies: (input: {
    brandCode: string;
    vehicleType: VehicleCatalogType;
  }) => Promise<readonly VehicleCatalogOption[]>;
  listVersions: (input: {
    brandCode: string;
    modelFamilyCode: string;
    vehicleType: VehicleCatalogType;
  }) => Promise<readonly VehicleCatalogVersionOption[]>;
  listYears: (input: {
    brandCode: string;
    vehicleType: VehicleCatalogType;
    versionCode: string;
  }) => Promise<readonly VehicleCatalogYearOption[]>;
  upsertBrand: (input: {
    code: string;
    name: string;
    vehicleType: VehicleCatalogType;
  }) => Promise<{ id: string }>;
  upsertModelFamily: (input: {
    brandId: string;
    name: string;
    vehicleType: VehicleCatalogType;
  }) => Promise<{ code: string; id: string; name: string }>;
  upsertSnapshotDetails: (input: VehicleCatalogSnapshot) => Promise<void>;
  upsertVersion: (input: {
    brandId: string;
    code: string;
    modelFamilyId: string;
    name: string;
    vehicleType: VehicleCatalogType;
  }) => Promise<{ id: string }>;
  upsertYear: (input: {
    code: string;
    fuelCode: string | null;
    modelYear: number | null;
    name: string;
    versionId: string;
  }) => Promise<void>;
};
