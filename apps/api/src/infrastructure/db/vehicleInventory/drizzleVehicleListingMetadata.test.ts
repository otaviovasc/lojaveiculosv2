import { describe, expect, it } from "vitest";
import {
  createListingMetadata,
  readListingCatalog,
} from "./drizzleVehicleListingMetadata.js";

const catalog = {
  brandCode: "59",
  brandLogoUrl: null,
  brandName: "Volvo",
  fipeCode: "029039-4",
  fuel: "Gasolina",
  modelCode: "2344",
  modelFamilyCode: "v40",
  modelFamilyName: "V40",
  modelName: "V40 T-4 2.0 Aut./Mec.",
  modelYear: 2013,
  priceCents: 6552600,
  referenceMonth: "agosto de 2026",
  source: "fipe" as const,
  vehicleType: "cars" as const,
  yearCode: "2013-1",
  yearName: "2013 Gasolina",
};

describe("vehicle listing catalog metadata", () => {
  it("persists and restores exact model-family identity", () => {
    const metadata = createListingMetadata({
      catalog,
      commercialTags: [],
      resaleAnalysis: null,
      videoUrl: null,
    });

    expect(readListingCatalog(metadata)).toEqual(catalog);
  });

  it("restores missing family fields as null for existing listings", () => {
    const {
      modelFamilyCode: _code,
      modelFamilyName: _name,
      ...legacyCatalog
    } = catalog;

    expect(readListingCatalog({ catalog: legacyCatalog })).toMatchObject({
      modelFamilyCode: null,
      modelFamilyName: null,
      modelName: catalog.modelName,
    });
  });
});
