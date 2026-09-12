import type { VehicleCatalogRepository } from "../ports/vehicleCatalogRepository.js";
import type { VehicleCatalogType } from "../ports/vehicleCatalogProvider.js";
import type {
  InventoryPlateCatalogIdentity,
  InventoryPlateLookupResponse,
} from "../ports/vehicleEnrichmentTypes.js";

export async function resolvePlateCatalogIdentity(
  lookup: InventoryPlateLookupResponse,
  repository: VehicleCatalogRepository,
): Promise<InventoryPlateCatalogIdentity> {
  if (lookup.fipeCandidates.length > 1) {
    return {
      candidates: await findCandidates(lookup, repository),
      catalog: null,
      reason: "multiple_fipe_candidates",
      status: "ambiguous",
    };
  }
  const reference = lookup.fipeCandidates[0];
  if (!reference?.code) {
    return {
      candidates: [],
      catalog: null,
      reason:
        lookup.catalogIdentity.reason === "fipe_provider_unavailable"
          ? "fipe_provider_unavailable"
          : "fipe_not_found",
      status: "unresolved",
    };
  }
  const candidates = await repository.listSnapshotsByFipeReference({
    fipeCode: reference.code,
    modelYear: reference.modelYear ?? lookup.vehicle.modelYear,
    vehicleType: resolveVehicleType(lookup.vehicle.vehicleType),
  });
  if (candidates.length === 1 && candidates[0]) {
    return {
      candidates: [],
      catalog: candidates[0],
      reason: null,
      status: "resolved",
    };
  }
  return candidates.length > 1
    ? {
        candidates,
        catalog: null,
        reason: "multiple_catalog_matches",
        status: "ambiguous",
      }
    : {
        candidates: [],
        catalog: null,
        reason: "catalog_not_found",
        status: "unresolved",
      };
}

async function findCandidates(
  lookup: InventoryPlateLookupResponse,
  repository: VehicleCatalogRepository,
) {
  const vehicleType = resolveVehicleType(lookup.vehicle.vehicleType);
  const candidates = await Promise.all(
    lookup.fipeCandidates.flatMap((reference) =>
      reference.code
        ? [
            repository.listSnapshotsByFipeReference({
              fipeCode: reference.code,
              modelYear: reference.modelYear ?? lookup.vehicle.modelYear,
              vehicleType,
            }),
          ]
        : [],
    ),
  );
  return candidates
    .flat()
    .filter(
      (candidate, index, all) =>
        all.findIndex(
          (item) =>
            item.brandCode === candidate.brandCode &&
            item.modelCode === candidate.modelCode &&
            item.yearCode === candidate.yearCode,
        ) === index,
    );
}

function resolveVehicleType(value: string | null): VehicleCatalogType {
  const normalized = value
    ?.normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  if (normalized?.includes("moto") || normalized?.includes("cycle")) {
    return "motorcycles";
  }
  if (
    normalized?.includes("truck") ||
    normalized?.includes("caminhao") ||
    normalized?.includes("camion")
  ) {
    return "trucks";
  }
  return "cars";
}
