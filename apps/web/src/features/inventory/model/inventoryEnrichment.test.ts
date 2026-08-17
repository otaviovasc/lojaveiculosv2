import { describe, expect, it } from "vitest";
import { createInitialInventoryForm } from "./formModel";
import {
  applyPlateLookupToForm,
  createResaleAnalysisInput,
  getCreateResaleAnalysisReadiness,
  hasEnoughDataForAnalysis,
} from "./inventoryEnrichment";
import type { InventoryPlateLookupResponse } from "./enrichmentTypes";

describe("inventory enrichment form helpers", () => {
  it("applies plate lookup fields without copying masked chassis values", () => {
    const form = createInitialInventoryForm();
    const result = applyPlateLookupToForm(form, lookupPayload());

    expect(result).toMatchObject({
      colorName: "white",
      doors: "4",
      engineAspiration: "turbo",
      engineDisplacement: "2.0",
      fuelType: "flex",
      manufactureYear: "2023",
      mileageKm: "60000",
      modelYear: "2023",
      plate: "ABC1D23",
      transmission: "automatic",
      title: "Fiat Strada Ranch 2023",
      trimName: "Ranch",
      vin: "",
    });
    expect(result.catalog).toMatchObject({
      brandName: "Fiat",
      fipeCode: "001268-0",
      modelName: "Strada Ranch",
      priceCents: 10550000,
    });
  });

  it("creates resale analysis input with FIPE-derived pricing references", () => {
    const form = {
      ...applyPlateLookupToForm(createInitialInventoryForm(), lookupPayload()),
      acquisitionPrice: "86.510,00",
      price: "102.335,00",
      storeId: "store_1",
    };

    const input = createResaleAnalysisInput(form, lookupPayload());

    expect(input).toMatchObject({
      acquisitionPriceCents: 8651000,
      bodyType: null,
      brand: "Fiat",
      city: "Belo Horizonte",
      fipePriceCents: 10550000,
      marketContext: null,
      model: "Strada Ranch",
      origin: "Nacional",
      recommendedAcquisitionPriceCents: 8651000,
      recommendedSellingPriceCents: 10233500,
      sellingPriceCents: 10233500,
      state: "MG",
      vehicleType: "Automovel",
      mileageKm: 60000,
    });
    expect(hasEnoughDataForAnalysis(form, lookupPayload())).toBe(true);
  });

  it("requires complete realistic data before enabling resale analysis", () => {
    const form = createInitialInventoryForm();

    const readiness = getCreateResaleAnalysisReadiness(form, null);

    expect(readiness).toEqual({
      isReady: false,
      missing: [
        { code: "store", label: "loja" },
        { code: "catalog", label: "marca e modelo do catálogo" },
        { code: "model_year", label: "ano do modelo" },
        { code: "mileage", label: "quilometragem" },
        { code: "acquisition_price", label: "valor de aquisição" },
        { code: "selling_price", label: "valor de venda" },
      ],
    });
  });

  it("accepts zero-km vehicles and uses mileage entered in the form", () => {
    const sparseMileageLookup = {
      ...lookupPayload(),
      vehicle: { ...lookupPayload().vehicle, mileageKm: null },
    };
    const form = {
      ...applyPlateLookupToForm(
        createInitialInventoryForm(),
        sparseMileageLookup,
      ),
      acquisitionPrice: "86.510,00",
      mileageKm: "0",
      price: "102.335,00",
      storeId: "store_1",
    };

    expect(createResaleAnalysisInput(form, sparseMileageLookup).mileageKm).toBe(
      0,
    );
    expect(getCreateResaleAnalysisReadiness(form, sparseMileageLookup)).toEqual(
      { isReady: true, missing: [] },
    );
  });

  it.each([
    ["modelYear", "1800", "model_year"],
    ["mileageKm", "-1", "mileage"],
    ["acquisitionPrice", "0", "acquisition_price"],
    ["price", "0", "selling_price"],
  ] as const)("rejects an unrealistic %s", (field, value, expectedCode) => {
    const form = {
      ...applyPlateLookupToForm(createInitialInventoryForm(), lookupPayload()),
      acquisitionPrice: "86.510,00",
      price: "102.335,00",
      storeId: "store_1",
      [field]: value,
    };

    expect(
      getCreateResaleAnalysisReadiness(form, lookupPayload()).missing.map(
        (issue) => issue.code,
      ),
    ).toContain(expectedCode);
  });

  it("uses FIPE data when the plate vehicle payload is sparse", () => {
    const lookup = {
      ...lookupPayload(),
      vehicle: {
        ...lookupPayload().vehicle,
        brand: null,
        model: null,
        modelYear: null,
        version: null,
      },
    };

    const result = applyPlateLookupToForm(createInitialInventoryForm(), lookup);

    expect(result).toMatchObject({
      modelYear: "2023",
      title: "Fiat Strada Ranch 2023",
      trimName: "Strada Ranch",
    });
  });

  it("does not fabricate a FIPE catalog when canonical identity is unresolved", () => {
    const lookup = {
      ...lookupPayload(),
      catalogIdentity: {
        candidates: [],
        catalog: null,
        reason: "catalog_not_found" as const,
        status: "unresolved" as const,
      },
    };

    const result = applyPlateLookupToForm(createInitialInventoryForm(), lookup);

    expect(result.catalog).toBeNull();
  });

  it("keeps the backend-confirmed catalog type instead of inferring from raw text", () => {
    const result = applyPlateLookupToForm(createInitialInventoryForm(), {
      ...lookupPayload(),
      vehicle: { ...lookupPayload().vehicle, vehicleType: "Moto" },
    });

    expect(result.catalog?.vehicleType).toBe("cars");
  });
});

function lookupPayload(): InventoryPlateLookupResponse {
  const catalog = {
    brandCode: "21",
    brandName: "Fiat",
    fipeCode: "001268-0",
    fuel: "Flex",
    modelCode: "4828",
    modelName: "Strada Ranch",
    modelYear: 2023,
    priceCents: 10550000,
    referenceMonth: "junho de 2026",
    source: "fipe" as const,
    vehicleType: "cars" as const,
    yearCode: "2023-1",
    yearName: "2023 Gasolina",
  };
  const fipe = {
    brandName: "Fiat",
    code: "001268-0",
    fuel: "Flex",
    modelName: "Strada Ranch",
    modelYear: 2023,
    priceCents: 10550000,
    priceLabel: "R$ 105.500,00",
    referenceMonth: "junho de 2026",
    score: 101,
  };
  return {
    catalogIdentity: {
      candidates: [],
      catalog,
      reason: null,
      status: "resolved",
    },
    fipe,
    fipeCandidates: [fipe],
    lookupVersion: 2,
    metadata: [{ label: "UF", value: "MG" }],
    plate: "ABC1D23",
    source: "apibrasil",
    vehicle: {
      aspiration: "Turbo",
      bodyType: null,
      brand: "Fiat",
      chassis: "*****12345",
      city: "Belo Horizonte",
      color: "Branca",
      doors: 4,
      engine: "1984",
      fuel: "Flex",
      manufactureYear: 2023,
      mileageKm: 60000,
      model: "Strada",
      modelYear: 2023,
      origin: "Nacional",
      power: null,
      state: "MG",
      transmission: "Automatica",
      vehicleType: "Automovel",
      version: "Ranch",
    },
  };
}
