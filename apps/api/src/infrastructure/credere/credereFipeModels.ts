import type { FinancingFipeVehicleCandidate } from "../../domains/financing/ports/financingProviderGateway.js";
import {
  readArray,
  readBoolean,
  readNumber,
  readRecord,
  readString,
} from "./credereHttpSupport.js";

export function mapCredereFipeModels(
  payload: Record<string, unknown>,
): FinancingFipeVehicleCandidate[] {
  return readArray(payload.vehicle_models)
    .map(mapCredereFipeModel)
    .filter(
      (candidate): candidate is FinancingFipeVehicleCandidate =>
        candidate !== null,
    );
}

function mapCredereFipeModel(
  value: unknown,
): FinancingFipeVehicleCandidate | null {
  const model = readRecord(value);
  const id = readString(model.id);
  if (!id) return null;
  const brand = readRecord(model.brand);
  const fuelType = readRecord(model.fuel_type);
  const fuelTypes = readArray(model.fuel_types)
    .map(readString)
    .filter((entry): entry is string => entry !== null);
  return {
    available:
      readBoolean(model.available) ?? readBoolean(model.active) ?? true,
    brand: readString(model.brand) ?? readString(brand.name),
    fipeCode: readString(model.fipe_code),
    fuelType: readString(fuelType.label) ?? (fuelTypes.join(", ") || null),
    id,
    molicarCode: readString(model.molicar_code),
    name: readString(model.model_name) ?? readString(model.name),
    version: readString(model.version),
    yearEnd: readNumber(model.year_end),
    yearStart: readNumber(model.year_start),
  };
}
