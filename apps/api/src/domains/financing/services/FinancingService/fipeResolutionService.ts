import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import { assertPermission } from "../../../../shared/authorization.js";
import type {
  FinancingFipeVehicleCandidate,
  FinancingTokenSet,
} from "../../ports/financingProviderGateway.js";
import type { FinancingProvider } from "../../ports/financingRepository.js";
import { resolveCredereVehicle } from "../../support/providerResolutionHelpers.js";
import { getUsableProviderConnection } from "../../support/tokenConnectionSupport.js";
import type { CreateCredereSimulationInput } from "./types.js";
import {
  financingSimulationCreatePermission,
  FinancingProviderMappingRequiredError,
  FinancingValidationError,
  getFinancingGateway,
  requireFinancingScope,
  type FinancingServicePorts,
} from "./serviceSupport.js";

const provider = "credere" satisfies FinancingProvider;

export type CredereFipeCandidate = {
  brand: string | null;
  fipeCode: string;
  fuelType: string | null;
  modelId: string;
  molicarCode: string;
  name: string;
  version: string | null;
  yearEnd: number | null;
  yearStart: number | null;
};

export type CredereFipeResolution =
  | { candidate: CredereFipeCandidate; status: "resolved" }
  | {
      candidates: readonly CredereFipeCandidate[];
      status: "ambiguous" | "mismatch";
    }
  | { candidates: readonly []; status: "not_found" };

export type ResolveCredereFipeInput = {
  fipeCode: string;
  modelYear: number;
  selectedModelId?: string;
  selectedMolicarCode?: string;
};

export async function resolveCredereFipeVehicle(
  context: ServiceContext,
  input: ResolveCredereFipeInput,
  ports: FinancingServicePorts,
): Promise<CredereFipeResolution> {
  assertPermission(context, financingSimulationCreatePermission);
  const scope = requireFinancingScope(context);
  validateInput(input);
  const connection = await getUsableProviderConnection(
    { provider, tenantId: scope.tenantId },
    ports,
  );
  const mapping = await ports.repository.findStoreMapping({
    provider,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  if (!mapping) throw new FinancingProviderMappingRequiredError();
  const resolution = await resolveExactFipeCandidate(
    mapping.providerStoreId,
    connection.token!,
    input,
    ports,
  );
  context.logger.info(
    "financing.fipe_resolution.read",
    createServiceLogMetadata(context, {
      candidateCount:
        resolution.status === "resolved" ? 1 : resolution.candidates.length,
      permission: financingSimulationCreatePermission,
      provider,
      status: resolution.status,
    }),
  );
  await context.audit.record({
    action: "financing.fipe_resolution.read",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "financing_vehicle_model",
    metadata: {
      candidateCount:
        resolution.status === "resolved" ? 1 : resolution.candidates.length,
      permission: financingSimulationCreatePermission,
      provider,
      status: resolution.status,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Resolved Credere vehicle model from exact FIPE selection",
    tenantId: scope.tenantId,
  });
  return resolution;
}

export async function resolveSubmittedCredereVehicle(
  providerStoreId: string,
  token: FinancingTokenSet,
  input: CreateCredereSimulationInput,
  ports: FinancingServicePorts,
) {
  if (input.vehicle.fipeCode) {
    const resolution = await resolveExactFipeCandidate(
      providerStoreId,
      token,
      {
        fipeCode: input.vehicle.fipeCode,
        modelYear: input.vehicle.modelYear,
        ...(input.vehicle.credereVehicleModelId
          ? { selectedModelId: input.vehicle.credereVehicleModelId }
          : {}),
        ...(input.vehicle.vehicleMolicarCode
          ? { selectedMolicarCode: input.vehicle.vehicleMolicarCode }
          : {}),
      },
      ports,
    );
    if (resolution.status !== "resolved") {
      throw new FinancingValidationError(messageForResolution(resolution));
    }
  }
  return resolveCredereVehicle(providerStoreId, token, input, ports);
}

async function resolveExactFipeCandidate(
  providerStoreId: string,
  token: FinancingTokenSet,
  input: ResolveCredereFipeInput,
  ports: FinancingServicePorts,
): Promise<CredereFipeResolution> {
  validateInput(input);
  const models = await getFinancingGateway(ports).listVehicleModelsByFipe({
    credereStoreId: providerStoreId,
    fipeCode: input.fipeCode.trim(),
    modelYear: input.modelYear,
    token,
  });
  const candidates = exactCandidates(models, input);
  if (candidates.length === 0) return { candidates: [], status: "not_found" };
  if (input.selectedModelId || input.selectedMolicarCode) {
    const selected = candidates.find(
      (candidate) =>
        candidate.modelId === input.selectedModelId?.trim() &&
        normalize(candidate.molicarCode) ===
          normalize(input.selectedMolicarCode ?? ""),
    );
    return selected
      ? { candidate: selected, status: "resolved" }
      : { candidates, status: "mismatch" };
  }
  return candidates.length === 1
    ? { candidate: candidates[0]!, status: "resolved" }
    : { candidates, status: "ambiguous" };
}

function exactCandidates(
  models: readonly FinancingFipeVehicleCandidate[],
  input: ResolveCredereFipeInput,
) {
  const fipeCode = normalize(input.fipeCode);
  const seenModels = new Set<string>();
  const seenMolicar = new Set<string>();
  const candidates: CredereFipeCandidate[] = [];
  for (const model of models) {
    const molicarCode = model.molicarCode?.trim();
    if (
      !model.available ||
      !molicarCode ||
      normalize(model.fipeCode ?? "") !== fipeCode ||
      (model.yearStart !== null && input.modelYear < model.yearStart) ||
      (model.yearEnd !== null && input.modelYear > model.yearEnd)
    ) {
      continue;
    }
    const modelId = model.id.trim();
    const molicarIdentity = normalize(molicarCode);
    if (seenModels.has(modelId) || seenMolicar.has(molicarIdentity)) continue;
    seenModels.add(modelId);
    seenMolicar.add(molicarIdentity);
    candidates.push({
      brand: model.brand,
      fipeCode: input.fipeCode.trim(),
      fuelType: model.fuelType,
      modelId,
      molicarCode,
      name: model.name?.trim() || "Modelo Credere sem nome",
      version: model.version,
      yearEnd: model.yearEnd,
      yearStart: model.yearStart,
    });
  }
  return candidates;
}

function validateInput(input: ResolveCredereFipeInput) {
  if (!/^\d{6}-\d$/.test(input.fipeCode.trim())) {
    throw new FinancingValidationError("Credere FIPE code is invalid.");
  }
  const nextYear = new Date().getUTCFullYear() + 1;
  if (
    !Number.isInteger(input.modelYear) ||
    input.modelYear < 1900 ||
    input.modelYear > nextYear
  ) {
    throw new FinancingValidationError("Credere FIPE model year is invalid.");
  }
}

function messageForResolution(
  resolution: Exclude<CredereFipeResolution, { status: "resolved" }>,
) {
  if (resolution.status === "ambiguous") {
    return "Credere FIPE selection is ambiguous and requires an explicit model choice.";
  }
  if (resolution.status === "mismatch") {
    return "Credere vehicle selection is stale or does not match the submitted FIPE code.";
  }
  return "Credere FIPE vehicle is not available for the submitted model year.";
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}
