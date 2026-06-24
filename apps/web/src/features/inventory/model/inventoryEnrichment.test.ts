import { describe, expect, it } from "vitest";
import { createInitialInventoryForm } from "./formModel";
import {
  applyPlateLookupToForm,
  createResaleAnalysisInput,
  hasEnoughDataForAnalysis,
} from "./inventoryEnrichment";
import type { InventoryPlateLookupResponse } from "./enrichmentTypes";

describe("inventory enrichment form helpers", () => {
  it("applies plate lookup fields without copying masked chassis values", () => {
    const form = createInitialInventoryForm();
    const result = applyPlateLookupToForm(form, lookupPayload());

    expect(result).toMatchObject({
      colorName: "Branca",
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
    });
    expect(hasEnoughDataForAnalysis(form, lookupPayload())).toBe(true);
  });
});

function lookupPayload(): InventoryPlateLookupResponse {
  return {
    fipe: {
      brandName: "Fiat",
      code: "001268-0",
      fuel: "Flex",
      modelName: "Strada Ranch",
      modelYear: 2023,
      priceCents: 10550000,
      priceLabel: "R$ 105.500,00",
      referenceMonth: "junho de 2026",
      score: 101,
    },
    metadata: [{ label: "UF", value: "MG" }],
    plate: "ABC1D23",
    source: "apibrasil",
    vehicle: {
      bodyType: null,
      brand: "Fiat",
      chassis: "*****12345",
      city: "Belo Horizonte",
      color: "Branca",
      engine: null,
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
