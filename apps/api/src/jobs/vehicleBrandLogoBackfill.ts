import type { VehicleCatalogRepository } from "../domains/vehicle/ports/vehicleCatalogRepository.js";
import type { VehicleCatalogType } from "../domains/vehicle/ports/vehicleCatalogProvider.js";
import { resolveVehicleBrandLogoUrl } from "../infrastructure/catalog/vehicleBrandLogoResolver.js";

const vehicleTypes = [
  "cars",
  "motorcycles",
  "trucks",
] as const satisfies readonly VehicleCatalogType[];

type BrandLogoRepository = Pick<
  VehicleCatalogRepository,
  "listBrands" | "upsertBrand"
>;

export type VehicleBrandLogoBackfillResult = {
  brandsSeen: number;
  logosResolved: number;
  logosUnchanged: number;
  logosUpdated: number;
  unresolvedBrands: readonly {
    name: string;
    vehicleType: VehicleCatalogType;
  }[];
};

export async function backfillVehicleBrandLogos(
  repository: BrandLogoRepository,
  resolveLogoUrl: (
    brandName: string,
  ) => string | null = resolveVehicleBrandLogoUrl,
): Promise<VehicleBrandLogoBackfillResult> {
  const result: VehicleBrandLogoBackfillResult = {
    brandsSeen: 0,
    logosResolved: 0,
    logosUnchanged: 0,
    logosUpdated: 0,
    unresolvedBrands: [],
  };
  const unresolvedBrands: {
    name: string;
    vehicleType: VehicleCatalogType;
  }[] = [];

  for (const vehicleType of vehicleTypes) {
    const brands = await repository.listBrands({ vehicleType });
    result.brandsSeen += brands.length;

    for (const brand of brands) {
      const imageUrl = resolveLogoUrl(brand.name);
      if (!imageUrl) {
        unresolvedBrands.push({ name: brand.name, vehicleType });
        continue;
      }

      result.logosResolved += 1;
      if (brand.imageUrl === imageUrl) {
        result.logosUnchanged += 1;
        continue;
      }

      await repository.upsertBrand({
        code: brand.code,
        imageUrl,
        name: brand.name,
        vehicleType,
      });
      result.logosUpdated += 1;
    }
  }

  unresolvedBrands.sort(
    (left, right) =>
      left.name.localeCompare(right.name) ||
      left.vehicleType.localeCompare(right.vehicleType),
  );
  return { ...result, unresolvedBrands };
}
