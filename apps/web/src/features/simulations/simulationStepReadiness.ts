import { isValidPreflightDocument } from "./applicantPreflight";
import type { SimulationFormStep } from "./SimulationFormNavigation";

/**
 * Pure gate predicates for each step of the simulation form. The same rules
 * back the disabled "Continuar" button (inline hint) and the click-time
 * backstop in SimulationForm. Submit-time validation in
 * simulationDraftBuilder remains the final guard.
 */
export type SimulationStepSnapshot = {
  cpfCnpj: string;
  credereVehicleModelId: string;
  downPayment: number | null;
  fipeCode: string;
  licensingCity: string;
  licensingUf: string;
  manufactureYear: string;
  modelYear: string;
  molicarCode: string;
  name: string;
  phone: string;
  preflightReady: boolean;
  vehicleValue: number | null;
};

export type SimulationStepReadiness =
  { ready: true } | { ready: false; reason: string };

export function simulationStepReadiness(
  step: SimulationFormStep,
  snapshot: SimulationStepSnapshot,
): SimulationStepReadiness {
  if (step === "vehicle") {
    if (!snapshot.manufactureYear || !snapshot.modelYear) {
      return {
        ready: false,
        reason: "Selecione o veículo e confirme os anos.",
      };
    }
    if (
      !snapshot.fipeCode ||
      !snapshot.molicarCode ||
      !snapshot.credereVehicleModelId
    ) {
      return {
        ready: false,
        reason: "Confirme a versão FIPE/Molicar antes de continuar.",
      };
    }
    if (!snapshot.licensingUf || !snapshot.licensingCity) {
      return {
        ready: false,
        reason: "Informe a UF e a cidade de licenciamento do veículo.",
      };
    }
    return { ready: true };
  }
  if (step === "applicant") {
    if (!snapshot.name.trim() || !snapshot.phone.replace(/\D/g, "")) {
      return {
        ready: false,
        reason: "Informe nome e telefone do proponente.",
      };
    }
    if (!isValidPreflightDocument(snapshot.cpfCnpj)) {
      return { ready: false, reason: "Informe um CPF/CNPJ válido." };
    }
    if (!snapshot.preflightReady) {
      return {
        ready: false,
        reason: "Confira o cadastro do proponente no Credere.",
      };
    }
    return { ready: true };
  }
  if (step === "terms") {
    if (
      !snapshot.downPayment ||
      !snapshot.vehicleValue ||
      snapshot.downPayment >= snapshot.vehicleValue
    ) {
      return {
        ready: false,
        reason: "Informe uma entrada válida e menor que o veículo.",
      };
    }
    return { ready: true };
  }
  return { ready: true };
}

export function simulationFinancedAmount(
  vehicleValue: number | null,
  downPayment: number | null,
) {
  if (vehicleValue == null || downPayment == null) return null;
  if (downPayment <= 0 || downPayment >= vehicleValue) return null;
  return vehicleValue - downPayment;
}

export function formatSimulationCurrency(value: number | null) {
  if (value == null) return null;
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value);
}
