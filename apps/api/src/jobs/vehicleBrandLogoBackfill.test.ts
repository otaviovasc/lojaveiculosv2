import { describe, expect, it, vi } from "vitest";
import type { VehicleCatalogRepository } from "../domains/vehicle/ports/vehicleCatalogRepository.js";
import { backfillVehicleBrandLogos } from "./vehicleBrandLogoBackfill.js";

describe("backfillVehicleBrandLogos", () => {
  it("updates resolved logos, skips matching values, and reports gaps", async () => {
    const upsertBrand = vi.fn<VehicleCatalogRepository["upsertBrand"]>(
      async (input) => ({ id: input.code }),
    );
    const listBrands = vi.fn<VehicleCatalogRepository["listBrands"]>(
      async ({ vehicleType }) => {
        if (vehicleType !== "cars") return [];
        return [
          { code: "21", imageUrl: null, name: "Fiat" },
          {
            code: "22",
            imageUrl: "https://logos.example/ford.svg",
            name: "Ford",
          },
          { code: "999", imageUrl: null, name: "Unknown Motors" },
        ];
      },
    );

    const result = await backfillVehicleBrandLogos(
      { listBrands, upsertBrand },
      (brandName) => {
        if (brandName === "Unknown Motors") return null;
        return `https://logos.example/${brandName.toLowerCase()}.svg`;
      },
    );

    expect(result).toEqual({
      brandsSeen: 3,
      logosResolved: 2,
      logosUnchanged: 1,
      logosUpdated: 1,
      unresolvedBrands: [{ name: "Unknown Motors", vehicleType: "cars" }],
    });
    expect(upsertBrand).toHaveBeenCalledExactlyOnceWith({
      code: "21",
      imageUrl: "https://logos.example/fiat.svg",
      name: "Fiat",
      vehicleType: "cars",
    });
  });
});
