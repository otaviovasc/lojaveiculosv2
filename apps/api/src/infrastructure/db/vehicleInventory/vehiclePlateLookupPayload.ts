import type { VehicleCatalogSnapshot } from "../../../domains/vehicle/ports/vehicleCatalogProvider.js";
import type {
  InventoryPlateLookupResponse,
  InventoryPlateMetadataItem,
} from "../../../domains/vehicle/ports/vehicleEnrichmentTypes.js";

export function parseVehiclePlateLookupPayload(
  value: unknown,
  fallbackPlate: string,
): InventoryPlateLookupResponse {
  const record = isRecord(value) ? value : {};
  const vehicle = isRecord(record.vehicle) ? record.vehicle : {};
  const fipe = readFipeReference(record.fipe);
  const fipeCandidates = Array.isArray(record.fipeCandidates)
    ? record.fipeCandidates.flatMap((candidate) => {
        const parsed = readFipeReference(candidate);
        return parsed ? [parsed] : [];
      })
    : fipe
      ? [fipe]
      : [];
  return {
    catalogIdentity: readCatalogIdentity(record.catalogIdentity),
    fipe,
    fipeCandidates,
    lookupVersion: record.lookupVersion === 2 ? 2 : 1,
    metadata: readMetadata(record.metadata),
    plate: readString(record.plate) ?? fallbackPlate,
    source: "apibrasil",
    vehicle: {
      aspiration: readString(vehicle.aspiration),
      bodyType: readString(vehicle.bodyType),
      brand: readString(vehicle.brand),
      chassis: readString(vehicle.chassis),
      city: readString(vehicle.city),
      color: readString(vehicle.color),
      doors: readNumber(vehicle.doors),
      engine: readString(vehicle.engine),
      fuel: readString(vehicle.fuel),
      manufactureYear: readNumber(vehicle.manufactureYear),
      mileageKm: readNumber(vehicle.mileageKm),
      model: readString(vehicle.model),
      modelYear: readNumber(vehicle.modelYear),
      origin: readString(vehicle.origin),
      power: readString(vehicle.power),
      state: readString(vehicle.state),
      transmission: readString(vehicle.transmission),
      vehicleType: readString(vehicle.vehicleType),
      version: readString(vehicle.version),
    },
  };
}

function readFipeReference(value: unknown) {
  if (!isRecord(value)) return null;
  return {
    brandName: readString(value.brandName),
    code: readString(value.code),
    fuel: readString(value.fuel),
    modelName: readString(value.modelName),
    modelYear: readNumber(value.modelYear),
    priceCents: readNumber(value.priceCents),
    priceLabel: readString(value.priceLabel),
    referenceMonth: readString(value.referenceMonth),
    score: readNumber(value.score),
  };
}

function readCatalogIdentity(
  value: unknown,
): InventoryPlateLookupResponse["catalogIdentity"] {
  if (!isRecord(value)) return unresolvedIdentity();
  const catalog = readCatalogSnapshot(value.catalog);
  if (value.status === "resolved" && catalog) {
    return { candidates: [], catalog, reason: null, status: "resolved" };
  }
  const candidates = Array.isArray(value.candidates)
    ? value.candidates.flatMap((candidate) => {
        const parsed = readCatalogSnapshot(candidate);
        return parsed ? [parsed] : [];
      })
    : [];
  if (value.status === "ambiguous") {
    return {
      candidates,
      catalog: null,
      reason:
        value.reason === "multiple_catalog_matches"
          ? "multiple_catalog_matches"
          : "multiple_fipe_candidates",
      status: "ambiguous",
    };
  }
  const reasons = [
    "catalog_not_found",
    "catalog_provider_unavailable",
    "fipe_not_found",
    "fipe_provider_unavailable",
  ] as const;
  return {
    candidates,
    catalog: null,
    reason:
      reasons.find((candidate) => candidate === value.reason) ??
      "catalog_not_found",
    status: "unresolved",
  };
}

function unresolvedIdentity(): InventoryPlateLookupResponse["catalogIdentity"] {
  return {
    candidates: [],
    catalog: null,
    reason: "catalog_not_found",
    status: "unresolved",
  };
}

function readCatalogSnapshot(value: unknown): VehicleCatalogSnapshot | null {
  if (!isRecord(value)) return null;
  const brandCode = readString(value.brandCode);
  const brandName = readString(value.brandName);
  const modelCode = readString(value.modelCode);
  const modelName = readString(value.modelName);
  const vehicleType = value.vehicleType;
  const yearCode = readString(value.yearCode);
  const yearName = readString(value.yearName);
  if (
    !brandCode ||
    !brandName ||
    !modelCode ||
    !modelName ||
    !yearCode ||
    !yearName ||
    (vehicleType !== "cars" &&
      vehicleType !== "motorcycles" &&
      vehicleType !== "trucks")
  ) {
    return null;
  }
  return {
    brandCode,
    brandLogoUrl: readString(value.brandLogoUrl),
    brandName,
    fipeCode: readString(value.fipeCode),
    fuel: readString(value.fuel),
    modelCode,
    modelFamilyCode: readString(value.modelFamilyCode),
    modelFamilyName: readString(value.modelFamilyName),
    modelName,
    modelYear: readNumber(value.modelYear),
    priceCents: readNumber(value.priceCents),
    referenceMonth: readString(value.referenceMonth),
    source: "fipe",
    vehicleType,
    yearCode,
    yearName,
  };
}

function readMetadata(value: unknown): InventoryPlateMetadataItem[] {
  return Array.isArray(value)
    ? value.flatMap((item) => {
        const record = isRecord(item) ? item : null;
        const label = readString(record?.label);
        const itemValue = readString(record?.value);
        return label && itemValue ? [{ label, value: itemValue }] : [];
      })
    : [];
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
