import type { FinancingVehicleAuthority } from "../ports/financingRepository.js";
import { FinancingValidationError } from "../services/FinancingService/serviceSupport.js";
import type { CreateCredereSimulationInput } from "../services/FinancingService/types.js";

export function applySimulationStockAuthority(
  input: CreateCredereSimulationInput,
  authority: FinancingVehicleAuthority | null,
): CreateCredereSimulationInput {
  if (!authority) return input;

  assertCompleteAuthority(authority);
  assertMatchesAuthority(input, authority);

  const vehicle = {
    ...input.vehicle,
    assetValueCents: authority.assetValueCents,
    manufactureYear: authority.manufactureYear,
    modelYear: authority.modelYear,
    zeroKm: authority.zeroKm,
  };
  if (authority.fipeCode) vehicle.fipeCode = authority.fipeCode;

  return { ...input, listingId: authority.listingId, vehicle };
}

function assertCompleteAuthority(
  authority: FinancingVehicleAuthority,
): asserts authority is FinancingVehicleAuthority & {
  assetValueCents: number;
  manufactureYear: number;
  modelYear: number;
} {
  if (
    typeof authority.assetValueCents !== "number" ||
    !Number.isInteger(authority.assetValueCents) ||
    authority.assetValueCents <= 0 ||
    typeof authority.manufactureYear !== "number" ||
    !Number.isInteger(authority.manufactureYear) ||
    typeof authority.modelYear !== "number" ||
    !Number.isInteger(authority.modelYear)
  ) {
    throw new FinancingValidationError(
      "Listing does not have complete financing data.",
    );
  }
}

function assertMatchesAuthority(
  input: CreateCredereSimulationInput,
  authority: FinancingVehicleAuthority & {
    assetValueCents: number;
    manufactureYear: number;
    modelYear: number;
  },
) {
  const submittedFipe = input.vehicle.fipeCode?.trim() || null;
  if (
    input.vehicle.assetValueCents !== authority.assetValueCents ||
    input.vehicle.manufactureYear !== authority.manufactureYear ||
    input.vehicle.modelYear !== authority.modelYear ||
    input.vehicle.zeroKm !== authority.zeroKm ||
    (authority.fipeCode !== null &&
      submittedFipe !== null &&
      submittedFipe !== authority.fipeCode)
  ) {
    throw new FinancingValidationError(
      "Vehicle data does not match the inventory listing.",
    );
  }
}
