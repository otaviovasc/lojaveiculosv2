import { describe, expect, it, vi } from "vitest";
import type { InventoryApi } from "../api/apiClient";
import type { InventoryPlateLookupResponse } from "./enrichmentTypes";
import { resolvePlateCatalogSnapshot } from "./plateCatalogResolution";

describe("plate catalog resolution", () => {
  it("resolves a canonical FIPE snapshot from plate names and year", async () => {
    const snapshot = {
      brandCode: "59",
      brandName: "Volvo",
      fipeCode: "029039-4",
      fuel: "Gasolina",
      modelCode: "2344",
      modelName: "V40 T-4 2.0 Aut./Mec.",
      modelYear: 2013,
      priceCents: 6501900,
      referenceMonth: "agosto de 2026",
      source: "fipe" as const,
      vehicleType: "cars" as const,
      yearCode: "2013-1",
      yearName: "2013 Gasolina",
    };
    const api = {
      getCatalogSnapshot: vi.fn(async () => snapshot),
      listCatalogBrands: vi.fn(async () => [
        { code: "21", name: "Fiat" },
        { code: "59", name: "Volvo" },
      ]),
      listCatalogModels: vi.fn(async () => [
        { code: "s40", name: "S40" },
        { code: "v40", name: "V40" },
      ]),
      listCatalogVersions: vi.fn(async () => [
        {
          code: "2342",
          modelFamilyCode: "v40",
          modelFamilyName: "V40",
          name: "T-4",
        },
        {
          code: "2344",
          modelFamilyCode: "v40",
          modelFamilyName: "V40",
          name: "T-4 2.0 Aut./Mec.",
        },
        {
          code: "7364",
          modelFamilyCode: "v40",
          modelFamilyName: "V40",
          name: "T-4 MOMENTUM 2.0 Aut.",
        },
      ]),
      listCatalogYears: vi.fn(async (_brandCode, versionCode) =>
        versionCode === "2344"
          ? [
              {
                code: "2013-1",
                fuelCode: "1",
                modelYear: 2013,
                name: "2013 Gasolina",
              },
            ]
          : [
              {
                code: "2000-1",
                fuelCode: "1",
                modelYear: 2000,
                name: "2000 Gasolina",
              },
            ],
      ),
    } as unknown as InventoryApi;

    await expect(
      resolvePlateCatalogSnapshot(api, lookupPayload()),
    ).resolves.toEqual(snapshot);
    expect(api.getCatalogSnapshot).toHaveBeenCalledWith({
      brandCode: "59",
      modelCode: "2344",
      vehicleType: "cars",
      yearCode: "2013-1",
    });
    expect(api.listCatalogYears).toHaveBeenCalledTimes(2);
  });

  it("fails open when the catalog cannot confidently match the plate", async () => {
    const api = {
      listCatalogBrands: vi.fn(async () => [{ code: "21", name: "Fiat" }]),
    } as unknown as InventoryApi;

    await expect(
      resolvePlateCatalogSnapshot(api, lookupPayload()),
    ).resolves.toBeNull();
  });
});

function lookupPayload(): InventoryPlateLookupResponse {
  return {
    fipe: {
      brandName: "Volvo",
      code: null,
      fuel: "Gasolina",
      modelName: "VOLVO V40 T4 DYNAMIC",
      modelYear: 2013,
      priceCents: null,
      priceLabel: null,
      referenceMonth: null,
      score: null,
    },
    metadata: [],
    plate: "AXD9738",
    source: "apibrasil",
    vehicle: {
      aspiration: null,
      bodyType: null,
      brand: "VOLVO I",
      chassis: null,
      city: null,
      color: null,
      engine: "2.0",
      fuel: "Gasolina",
      manufactureYear: 2013,
      mileageKm: null,
      model: "VOLVO V40",
      modelYear: 2013,
      origin: null,
      power: null,
      state: null,
      transmission: "Aut./Mec.",
      vehicleType: "Automovel",
      version: "T4 DYNAMIC",
    },
  };
}
