import type { VehicleCatalogRepository } from "../../../../domains/vehicle/ports/vehicleCatalogRepository.js";

export function createMemoryVehicleCatalogRepository(): VehicleCatalogRepository {
  const brands = [{ code: "21", name: "Fiat" }];
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

  return {
    createSyncRun: async (input) => ({
      id: `sync_${input.vehicleType}`,
      vehicleType: input.vehicleType,
    }),
    finishSyncRun: async () => undefined,
    getSnapshot: async (input) => ({
      brandCode: input.brandCode,
      brandName: "Fiat",
      fipeCode: "001267-0",
      fuel: "Flex",
      modelCode: input.versionCode,
      modelName: "Toro Volcano 2.0 16V 4x4 TB Diesel Aut.",
      modelYear: 2024,
      priceCents: 12690000,
      referenceMonth: "junho de 2026",
      source: "fipe",
      vehicleType: input.vehicleType,
      yearCode: input.yearCode,
      yearName: "2024 Gasolina",
    }),
    listBrands: async () => brands,
    listModelFamilies: async () => models,
    listVersions: async () => versions,
    listYears: async () => years,
    upsertBrand: async (input) => ({ id: input.code }),
    upsertModelFamily: async (input) => ({
      code: input.name.toLowerCase(),
      id: input.name.toLowerCase(),
      name: input.name,
    }),
    upsertSnapshotDetails: async () => undefined,
    upsertVersion: async (input) => ({ id: input.code }),
    upsertYear: async () => undefined,
  };
}
