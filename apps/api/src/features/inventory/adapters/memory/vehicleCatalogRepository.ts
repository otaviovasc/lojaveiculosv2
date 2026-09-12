import type { VehicleCatalogRepository } from "../../../../domains/vehicle/ports/vehicleCatalogRepository.js";

export function createMemoryVehicleCatalogRepository(): VehicleCatalogRepository {
  const brands = [{ code: "21", imageUrl: null, name: "Fiat" }];
  const models = [{ code: "toro", name: "Toro" }];
  const versions = [
    {
      code: "4828",
      modelFamilyCode: "toro",
      modelFamilyName: "Toro",
      name: "Toro Volcano 2.0 16V 4x4 TB Diesel Aut.",
    },
  ];
  const years = [
    {
      code: "2024-1",
      fuelCode: "1",
      modelYear: 2024,
      name: "2024 Gasolina",
    },
  ];

  const snapshot = {
    brandCode: "21",
    brandLogoUrl: null,
    brandName: "Fiat",
    fipeCode: "001267-0",
    fuel: "Flex",
    modelCode: "4828",
    modelFamilyCode: "toro",
    modelFamilyName: "Toro",
    modelName: "Toro Volcano 2.0 16V 4x4 TB Diesel Aut.",
    modelYear: 2024,
    priceCents: 12690000,
    referenceMonth: "junho de 2026",
    source: "fipe" as const,
    vehicleType: "cars" as const,
    yearCode: "2024-1",
    yearName: "2024 Gasolina",
  };

  return {
    createSyncRun: async (input) => ({
      id: `sync_${input.vehicleType}`,
      vehicleType: input.vehicleType,
    }),
    finishSyncRun: async () => undefined,
    getSnapshot: async (input) => ({
      ...snapshot,
      brandCode: input.brandCode,
      modelCode: input.versionCode,
      vehicleType: input.vehicleType,
      yearCode: input.yearCode,
    }),
    listSnapshotsByFipeReference: async (input) =>
      input.fipeCode === snapshot.fipeCode &&
      input.vehicleType === snapshot.vehicleType &&
      (input.modelYear === null || input.modelYear === snapshot.modelYear)
        ? [snapshot]
        : [],
    listBrands: async () => brands,
    listModelFamilies: async () => models,
    listVersions: async () => versions,
    listYears: async () => years,
    getVersionYearSyncState: async () => ({
      lastSyncedAt: new Date(),
      yearCount: years.length,
    }),
    listPriceHistory: async () => [],
    upsertBrand: async (input) => ({ id: input.code }),
    upsertModelFamily: async (input) => ({
      code: input.name.toLowerCase(),
      id: input.name.toLowerCase(),
      name: input.name,
    }),
    upsertPriceHistory: async () => undefined,
    upsertReferences: async () => undefined,
    upsertSnapshotDetails: async () => undefined,
    upsertVersion: async (input) => ({ id: input.code }),
    upsertYear: async () => undefined,
  };
}
