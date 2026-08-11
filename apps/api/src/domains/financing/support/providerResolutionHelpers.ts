import type {
  FinancingSimulationInput,
  FinancingVehicleModel,
} from "../ports/financingProviderGateway.js";
import type { FinancingTokenSet } from "../ports/financingRepository.js";
import type { CreateCredereSimulationInput } from "../services/FinancingService/types.js";
import {
  FinancingValidationError,
  getFinancingGateway,
  normalizeDocument,
  type FinancingServicePorts,
} from "../services/FinancingService/serviceSupport.js";

export async function resolveCredereSellerCpf(
  providerStoreId: string,
  token: FinancingTokenSet,
  ports: FinancingServicePorts,
): Promise<string> {
  const sellers = await getFinancingGateway(ports).listSellers({
    credereStoreId: providerStoreId,
    token,
  });
  const seller = sellers.find(
    (item) =>
      normalizeDocument(item.cpf).length === 11 && item.active !== false,
  );
  if (!seller) {
    throw new FinancingValidationError("Credere seller is not configured.");
  }
  return normalizeDocument(seller.cpf);
}

export async function resolveCredereVehicle(
  providerStoreId: string,
  token: FinancingTokenSet,
  input: CreateCredereSimulationInput,
  ports: FinancingServicePorts,
): Promise<FinancingSimulationInput["vehicle"]> {
  validateProviderRequiredFields(input);
  const query = input.vehicle.vehicleMolicarCode?.trim();
  if (!query) {
    throw new FinancingValidationError(
      "Credere vehicle model reference is required.",
    );
  }
  const model = await getFinancingGateway(ports).lookupVehicleModel({
    credereStoreId: providerStoreId,
    manufactureYear: input.vehicle.manufactureYear,
    modelYear: input.vehicle.modelYear,
    query,
    token,
  });
  if (!isUsableVehicleModel(model)) {
    throw new FinancingValidationError(
      "Credere vehicle model is not available.",
    );
  }
  validateVehicleModelYear(input.vehicle.modelYear, model);
  validateSelectedVehicleModel(input, model);
  return {
    ...input.vehicle,
    credereVehicleModelId: input.vehicle.credereVehicleModelId ?? model.id,
    ...(input.vehicle.vehicleMolicarCode || !model.molicarCode
      ? {}
      : { vehicleMolicarCode: model.molicarCode }),
  };
}

function validateVehicleModelYear(
  modelYear: number,
  model: FinancingVehicleModel,
) {
  if (
    (model.yearStart !== null && modelYear < model.yearStart) ||
    (model.yearEnd !== null && modelYear > model.yearEnd)
  ) {
    throw new FinancingValidationError(
      "Credere vehicle model is not available for the submitted model year.",
    );
  }
}

function isUsableVehicleModel(
  model: FinancingVehicleModel | null,
): model is FinancingVehicleModel {
  return Boolean(model?.active && model.id);
}

function validateSelectedVehicleModel(
  input: CreateCredereSimulationInput,
  model: FinancingVehicleModel,
) {
  const selectedModelId = input.vehicle.credereVehicleModelId?.trim();
  if (selectedModelId && selectedModelId !== model.id) {
    throw new FinancingValidationError(
      "Credere vehicle model selection does not match the submitted Molicar code.",
    );
  }
  const submittedMolicarCode = normalizeMolicarCode(
    input.vehicle.vehicleMolicarCode,
  );
  const resolvedMolicarCode = normalizeMolicarCode(model.molicarCode);
  if (resolvedMolicarCode && submittedMolicarCode !== resolvedMolicarCode) {
    throw new FinancingValidationError(
      "Credere vehicle model selection does not match the submitted Molicar code.",
    );
  }
}

function normalizeMolicarCode(value: string | null | undefined) {
  return value?.replace(/\D/g, "") ?? "";
}

function validateProviderRequiredFields(
  input: CreateCredereSimulationInput,
): void {
  const required: Record<string, unknown> = {
    amountCents: input.amountCents,
    downPaymentCents: input.downPaymentCents,
    installments: input.installments,
    "consent.termsVersion": input.consent.termsVersion,
    "customer.document": input.customer.document,
    "customer.name": input.customer.name,
    "customer.phone": input.customer.phone,
    "vehicle.assetValueCents": input.vehicle.assetValueCents,
    "vehicle.licensingCity": input.vehicle.licensingCity,
    "vehicle.licensingUf": input.vehicle.licensingUf,
    "vehicle.manufactureYear": input.vehicle.manufactureYear,
    "vehicle.modelYear": input.vehicle.modelYear,
    "vehicle.zeroKm": input.vehicle.zeroKm,
  };
  for (const [field, value] of Object.entries(required)) {
    if (value === null || value === undefined || value === "") {
      throw new FinancingValidationError(`Missing required field: ${field}`);
    }
  }
}
