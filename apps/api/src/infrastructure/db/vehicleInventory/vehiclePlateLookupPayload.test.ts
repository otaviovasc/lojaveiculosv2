import { describe, expect, it } from "vitest";
import { parseVehiclePlateLookupPayload } from "./vehiclePlateLookupPayload.js";

describe("parseVehiclePlateLookupPayload", () => {
  it("reconstructs versioned catalog identity, candidates, and supported fields", () => {
    const catalog = {
      brandCode: "59",
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
      source: "fipe",
      vehicleType: "cars",
      yearCode: "2013-1",
      yearName: "2013 Gasolina",
    };
    const fipe = {
      brandName: "Volvo",
      code: "029039-4",
      fuel: "gasolina",
      modelName: "V40 T-4 2.0 Aut./Mec.",
      modelYear: 2013,
      priceCents: 6552600,
      priceLabel: null,
      referenceMonth: "agosto de 2026",
      score: null,
    };

    expect(
      parseVehiclePlateLookupPayload(
        {
          catalogIdentity: {
            candidates: [],
            catalog,
            reason: null,
            status: "resolved",
          },
          fipe,
          fipeCandidates: [fipe],
          lookupVersion: 2,
          metadata: [],
          plate: "AXD9H38",
          vehicle: { doors: 4 },
        },
        "AXD9H38",
      ),
    ).toMatchObject({
      catalogIdentity: { catalog, status: "resolved" },
      fipeCandidates: [{ code: "029039-4" }],
      lookupVersion: 2,
      vehicle: { doors: 4 },
    });
  });

  it("marks legacy cache payloads as version 1 so services refetch them", () => {
    expect(parseVehiclePlateLookupPayload({}, "AXD9H38")).toMatchObject({
      lookupVersion: 1,
      plate: "AXD9H38",
    });
  });

  it("keeps resolved legacy snapshots readable without family fields", () => {
    const catalog = {
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
    };

    expect(
      parseVehiclePlateLookupPayload(
        {
          catalogIdentity: {
            candidates: [],
            catalog,
            reason: null,
            status: "resolved",
          },
          lookupVersion: 2,
        },
        "AXD9H38",
      ).catalogIdentity.catalog,
    ).toMatchObject({
      modelFamilyCode: null,
      modelFamilyName: null,
      modelName: "V40 T-4 2.0 Aut./Mec.",
    });
  });
});
