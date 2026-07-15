import {
  normalizeVehicleEngineAspiration,
  normalizeVehicleEngineDisplacement,
  type VehicleEngineAspiration,
  type VehicleEngineDisplacement,
} from "@lojaveiculosv2/shared";
import type {
  VehicleFuelType,
  VehicleListingCatalog,
  VehicleTransmission,
} from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";

export type TradeInSnapshot = {
  brand: string | null;
  catalog: VehicleListingCatalog | null;
  chassi: string | null;
  color: string | null;
  doors: number | null;
  enabled: boolean;
  engineAspiration: VehicleEngineAspiration | null;
  engineDisplacement: VehicleEngineDisplacement | null;
  fuelType: VehicleFuelType | null;
  mileageKm: number | null;
  model: string | null;
  plate: string | null;
  renavam: string | null;
  transmission: VehicleTransmission | null;
  valuationCents: number | null;
  yearFabrication: number | null;
  yearModel: number | null;
};

export function readTradeInSnapshot(value: unknown): TradeInSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.enabled !== true) return null;
  const catalog = readCatalog(record.catalog);
  const tradeIn = {
    brand: readString(record.brand) ?? catalog?.brandName ?? null,
    catalog,
    chassi: readString(record.chassi) ?? readString(record.chassis),
    color: readString(record.color),
    doors: readInteger(record.doors),
    enabled: true,
    engineAspiration: normalizeVehicleEngineAspiration(
      readString(record.engineAspiration),
    ),
    engineDisplacement: normalizeVehicleEngineDisplacement(
      readString(record.engineDisplacement),
    ),
    fuelType: readOneOf(record.fuelType, fuelTypes),
    mileageKm: readInteger(record.mileageKm),
    model: readString(record.model) ?? catalog?.modelName ?? null,
    plate: readString(record.plate),
    renavam: readString(record.renavam),
    transmission: readOneOf(record.transmission, transmissionTypes),
    valuationCents: readCents(record.valuationCents),
    yearFabrication: readInteger(record.yearFabrication),
    yearModel: readInteger(record.yearModel) ?? catalog?.modelYear ?? null,
  } satisfies TradeInSnapshot;

  if (!tradeIn.brand && !tradeIn.model && !tradeIn.plate && !tradeIn.chassi) {
    return null;
  }
  return tradeIn;
}

const fuelTypes = [
  "diesel",
  "electric",
  "ethanol",
  "flex",
  "gasoline",
  "hybrid",
  "other",
] as const;

const transmissionTypes = [
  "automated",
  "automatic",
  "cvt",
  "manual",
  "other",
] as const;

function readCatalog(value: unknown): VehicleListingCatalog | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const brandName = readString(record.brandName);
  const modelName = readString(record.modelName);
  if (!brandName && !modelName) return null;
  const modelYear = readInteger(record.modelYear);
  return {
    brandCode: readString(record.brandCode),
    brandLogoUrl: readString(record.brandLogoUrl),
    brandName,
    fipeCode: readString(record.fipeCode),
    fuel: readString(record.fuel),
    modelCode: readString(record.modelCode),
    modelName,
    modelYear,
    priceCents: readCents(record.priceCents),
    referenceMonth: readString(record.referenceMonth),
    source: record.source === "fipe" ? "fipe" : null,
    vehicleType: readOneOf(record.vehicleType, [
      "cars",
      "motorcycles",
      "trucks",
    ] as const),
    yearCode: readString(record.yearCode),
    yearName:
      readString(record.yearName) ?? (modelYear ? String(modelYear) : null),
  };
}

function readOneOf<const Value extends string>(
  value: unknown,
  options: readonly Value[],
): Value | null {
  return typeof value === "string" && options.includes(value as Value)
    ? (value as Value)
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readInteger(value: unknown): number | null {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : null;
  if (!Number.isInteger(numberValue) || Number(numberValue) <= 0) return null;
  return Number(numberValue);
}

function readCents(value: unknown): number | null {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : null;
  if (!Number.isInteger(numberValue) || Number(numberValue) < 0) return null;
  return Number(numberValue);
}
