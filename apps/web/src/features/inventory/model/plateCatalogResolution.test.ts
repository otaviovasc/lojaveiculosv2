import { describe, expect, it, vi } from "vitest";
import type { InventoryApi } from "../api/apiClient";
import type { InventoryPlateLookupResponse } from "./enrichmentTypes";
import { resolvePlateCatalogSnapshot } from "./plateCatalogResolution";

describe("plate catalog resolution", () => {
  it("uses the backend-confirmed canonical FIPE identity", async () => {
    const lookup = lookupPayload();
    const api = {} as InventoryApi;

    await expect(resolvePlateCatalogSnapshot(api, lookup)).resolves.toEqual(
      lookup.catalogIdentity.status === "resolved"
        ? lookup.catalogIdentity.catalog
        : null,
    );
  });

  it("does not run a fuzzy client-side fallback for unresolved identities", async () => {
    const api = {
      listCatalogBrands: vi.fn(),
    } as unknown as InventoryApi;
    const lookup: InventoryPlateLookupResponse = {
      ...lookupPayload(),
      catalogIdentity: {
        candidates: [],
        catalog: null,
        reason: "catalog_not_found",
        status: "unresolved",
      },
    };

    await expect(resolvePlateCatalogSnapshot(api, lookup)).resolves.toBeNull();
    expect(api.listCatalogBrands).not.toHaveBeenCalled();
  });
});

function lookupPayload(): InventoryPlateLookupResponse {
  const fipe = {
    brandName: "Volvo",
    code: "029039-4",
    fuel: "Gasolina",
    modelName: "V40 T-4 2.0 Aut./Mec.",
    modelYear: 2013,
    priceCents: 6552600,
    priceLabel: null,
    referenceMonth: "agosto de 2026",
    score: null,
  };
  return {
    catalogIdentity: {
      candidates: [],
      catalog: {
        brandCode: "59",
        brandName: "Volvo",
        fipeCode: "029039-4",
        fuel: "Gasolina",
        modelCode: "2344",
        modelName: "V40 T-4 2.0 Aut./Mec.",
        modelYear: 2013,
        priceCents: 6552600,
        referenceMonth: "agosto de 2026",
        source: "fipe",
        vehicleType: "cars",
        yearCode: "2013-1",
        yearName: "2013 Gasolina",
      },
      reason: null,
      status: "resolved",
    },
    fipe,
    fipeCandidates: [fipe],
    lookupVersion: 2,
    metadata: [],
    plate: "AXD9H38",
    source: "apibrasil",
    vehicle: {
      aspiration: null,
      bodyType: "999",
      brand: "VOLVO",
      chassis: null,
      city: "PATO BRANCO",
      color: "BRANCA",
      doors: null,
      engine: "1984",
      fuel: "GASOLINA",
      manufactureYear: 2013,
      mileageKm: null,
      model: "I/VOLVO V40 T4 DYNAMIC",
      modelYear: 2013,
      origin: "IMPORTADO",
      power: "180",
      state: "PR",
      transmission: null,
      vehicleType: "Automovel",
      version: null,
    },
  };
}
