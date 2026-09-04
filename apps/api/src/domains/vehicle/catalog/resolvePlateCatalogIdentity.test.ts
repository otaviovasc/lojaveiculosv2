import { describe, expect, it, vi } from "vitest";
import type { VehicleCatalogRepository } from "../ports/vehicleCatalogRepository.js";
import type { InventoryPlateLookupResponse } from "../ports/vehicleEnrichmentTypes.js";
import { resolvePlateCatalogIdentity } from "./resolvePlateCatalogIdentity.js";

describe("resolvePlateCatalogIdentity", () => {
  it("resolves an exact FIPE code and year to mandatory catalog codes", async () => {
    const catalog = catalogSnapshot();
    const repository = {
      listSnapshotsByFipeReference: vi.fn(async () => [catalog]),
    } as unknown as VehicleCatalogRepository;

    await expect(
      resolvePlateCatalogIdentity(lookupPayload(), repository),
    ).resolves.toEqual({
      candidates: [],
      catalog,
      reason: null,
      status: "resolved",
    });
    expect(repository.listSnapshotsByFipeReference).toHaveBeenCalledWith({
      fipeCode: "029039-4",
      modelYear: 2013,
      vehicleType: "cars",
    });
  });

  it("keeps multiple FIPE candidates explicitly ambiguous", async () => {
    const repository = {
      listSnapshotsByFipeReference: vi.fn(async () => [catalogSnapshot()]),
    } as unknown as VehicleCatalogRepository;
    const lookup = lookupPayload();

    const result = await resolvePlateCatalogIdentity(
      {
        ...lookup,
        fipeCandidates: [
          ...lookup.fipeCandidates,
          { ...lookup.fipeCandidates[0]!, code: "029040-8" },
        ],
      },
      repository,
    );

    expect(result).toMatchObject({
      reason: "multiple_fipe_candidates",
      status: "ambiguous",
    });
  });
});

function catalogSnapshot() {
  return {
    brandCode: "59",
    brandName: "Volvo",
    fipeCode: "029039-4",
    fuel: "Gasolina",
    modelCode: "2344",
    modelName: "V40 T-4 2.0 Aut./Mec.",
    modelYear: 2013,
    priceCents: 6552600,
    referenceMonth: "agosto de 2026",
    source: "fipe" as const,
    vehicleType: "cars" as const,
    yearCode: "2013-1",
    yearName: "2013 Gasolina",
  };
}

function lookupPayload(): InventoryPlateLookupResponse {
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
  return {
    catalogIdentity: {
      candidates: [],
      catalog: null,
      reason: "catalog_not_found",
      status: "unresolved",
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
