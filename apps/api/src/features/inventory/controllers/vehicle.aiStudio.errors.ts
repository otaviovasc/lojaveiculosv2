import type { VehicleAiStudioProviderError } from "../../../domains/vehicle/ports/vehicleAiStudioProvider.js";

export function createVehicleAiStudioProviderPublicDetails(
  error: VehicleAiStudioProviderError,
) {
  const details = error.details;
  if (!details) return undefined;
  return {
    ...(details.phase ? { phase: details.phase } : {}),
    ...(details.providerAssetId
      ? { providerAssetId: details.providerAssetId }
      : {}),
    ...(details.providerGenerationId
      ? { providerGenerationId: details.providerGenerationId }
      : {}),
    ...(details.providerGenerationStatus
      ? { providerGenerationStatus: details.providerGenerationStatus }
      : {}),
    ...(details.providerProgress !== undefined
      ? { providerProgress: details.providerProgress }
      : {}),
    ...(details.providerStatus
      ? { providerStatus: details.providerStatus }
      : {}),
    ...(details.timeoutMs ? { timeoutMs: details.timeoutMs } : {}),
    provider: details.provider,
  };
}
