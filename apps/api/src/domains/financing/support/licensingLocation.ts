import { getStateByCode } from "@lojaveiculosv2/shared";
import type { CreateCredereSimulationInput } from "../services/FinancingService/types.js";
import { FinancingValidationError } from "../services/FinancingService/serviceSupport.js";

export type CanonicalLicensingLocation = {
  licensingCity: string;
  licensingUf: string;
};

function normalizeLocationPart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

export function canonicalizeLicensingLocation(
  licensingCity: string,
  licensingUf: string,
): CanonicalLicensingLocation {
  const canonicalUf = licensingUf.trim().toUpperCase();
  const state = getStateByCode(canonicalUf);
  if (!state) {
    throw new FinancingValidationError("Licensing UF is not valid.");
  }

  const cityKey = normalizeLocationPart(licensingCity);
  const canonicalCity = state.cities.find(
    (city) => normalizeLocationPart(city) === cityKey,
  );
  if (!canonicalCity) {
    throw new FinancingValidationError(
      "Licensing city does not belong to the submitted UF.",
    );
  }

  return { licensingCity: canonicalCity, licensingUf: state.code };
}

export function canonicalizeSimulationLicensing(
  input: CreateCredereSimulationInput,
): CreateCredereSimulationInput {
  return {
    ...input,
    vehicle: {
      ...input.vehicle,
      ...canonicalizeLicensingLocation(
        input.vehicle.licensingCity,
        input.vehicle.licensingUf,
      ),
    },
  };
}
