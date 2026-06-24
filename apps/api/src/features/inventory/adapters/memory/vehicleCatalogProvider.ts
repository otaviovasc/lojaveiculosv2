import type { VehicleCatalogProvider } from "../../../../domains/vehicle/ports/vehicleCatalogProvider.js";

export function createMemoryVehicleCatalogProvider(): VehicleCatalogProvider {
  return {
    getVehicle: async () => ({
      brandCode: "21",
      brandLogoUrl: null,
      brandName: "Fiat",
      fipeCode: "001267-0",
      fuel: "Flex",
      modelCode: "4828",
      modelName: "Toro Volcano 2.0 16V 4x4 TB Diesel Aut.",
      modelYear: 2024,
      priceCents: 12690000,
      referenceMonth: "junho de 2026",
      source: "fipe",
      vehicleType: "cars",
      yearCode: "2024-1",
      yearName: "2024 Gasolina",
    }),
    listBrands: async () => [{ code: "21", imageUrl: null, name: "Fiat" }],
    listModels: async () => [{ code: "4828", name: "Toro Volcano" }],
    listYears: async () => [
      {
        code: "2024-1",
        fuelCode: "1",
        modelYear: 2024,
        name: "2024 Gasolina",
      },
    ],
  };
}
