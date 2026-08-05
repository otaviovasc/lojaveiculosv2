import { describe, expect, it, vi } from "vitest";
import type { InventoryApi } from "../api/apiClient";
import type { InventoryPlateLookupResponse } from "./enrichmentTypes";
import { resolvePlateCatalogSnapshot } from "./plateCatalogResolution";

describe("plate catalog resolution", () => {
  it("resolves a canonical FIPE snapshot from plate names and year", async () => {
    const snapshot = {
      brandCode: "59",
      brandName: "Volvo",
      fipeCode: "029089-2",
      fuel: "Gasolina",
      modelCode: "9001",
      modelName: "XC60 2.0 T5",
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
        { code: "700", name: "XC40" },
        { code: "900", name: "XC60" },
      ]),
      listCatalogVersions: vi.fn(async () => [
        {
          code: "9000",
          modelFamilyCode: "900",
          modelFamilyName: "XC60",
          name: "XC60 3.0 AWD",
        },
        {
          code: "9001",
          modelFamilyCode: "900",
          modelFamilyName: "XC60",
          name: "XC60 2.0 T5",
        },
      ]),
      listCatalogYears: vi.fn(async () => [
        {
          code: "2014-1",
          fuelCode: "1",
          modelYear: 2014,
          name: "2014 Gasolina",
        },
        {
          code: "2013-1",
          fuelCode: "1",
          modelYear: 2013,
          name: "2013 Gasolina",
        },
      ]),
    } as unknown as InventoryApi;

    await expect(
      resolvePlateCatalogSnapshot(api, lookupPayload()),
    ).resolves.toEqual(snapshot);
    expect(api.getCatalogSnapshot).toHaveBeenCalledWith({
      brandCode: "59",
      modelCode: "9001",
      vehicleType: "cars",
      yearCode: "2013-1",
    });
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
      modelName: "XC60 2.0 T5",
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
      brand: "Volvo",
      chassis: null,
      city: null,
      color: null,
      engine: "2.0",
      fuel: "Gasolina",
      manufactureYear: 2013,
      mileageKm: null,
      model: "XC60",
      modelYear: 2013,
      origin: null,
      power: null,
      state: null,
      transmission: "Aut./Mec.",
      vehicleType: "Automovel",
      version: "2.0 T5",
    },
  };
}
