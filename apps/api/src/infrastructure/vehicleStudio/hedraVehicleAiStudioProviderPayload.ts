import type {
  GeneratedVehicleAiStudioImage,
  GenerateVehicleAiStudioProviderInput,
} from "../../domains/vehicle/ports/vehicleAiStudioProvider.js";
import { VehicleAiStudioProviderError } from "../../domains/vehicle/ports/vehicleAiStudioProvider.js";
import { downloadGeneratedImage } from "./hedraVehicleAiStudioDownload.js";
import { resolveGeneratedAssetImage } from "./hedraVehicleAiStudioGeneratedAsset.js";
import {
  authValue,
  createProviderHttpError,
  fetchWithTimeout,
  previewPayload,
  toUrl,
} from "./hedraVehicleAiStudioHttp.js";
import {
  extractGeneratedImage,
  isCompletedStatus,
  isFailedStatus,
  readGeneratedAssetId,
  readGenerationId,
  readGenerationProgressDetails,
  readStatusUrl,
} from "./hedraVehicleAiStudioPayloadFields.js";

type ResolveGeneratedImageInput = {
  apiKey: string;
  assetPath: string;
  authHeader: string;
  authScheme: string;
  baseUrl: string;
  fetch: typeof globalThis.fetch;
  input: GenerateVehicleAiStudioProviderInput;
  payload: unknown;
  pollIntervalMs: number;
  pollMaxAttempts: number;
  requestTimeoutMs: number;
  statusPath?: string;
};

export async function resolveGeneratedImage(
  input: ResolveGeneratedImageInput,
): Promise<GeneratedVehicleAiStudioImage> {
  const generationId = readGenerationId(input.payload);
  const initial = await resolveImageReference(
    input,
    input.payload,
    generationId,
  );
  if (initial) return initial;

  const statusUrl =
    readStatusUrl(input.payload) ??
    (generationId && input.statusPath
      ? toUrl(input.baseUrl, input.statusPath.replace("{id}", generationId))
      : null);

  if (!statusUrl) {
    throw noImageResultError(input.payload, "generation", generationId);
  }

  let lastPayload: unknown = input.payload;
  for (let attempt = 0; attempt < input.pollMaxAttempts; attempt += 1) {
    await delay(input.pollIntervalMs);
    const payload = await fetchGenerationStatus(input, statusUrl);
    lastPayload = payload;

    const image = await resolveImageReference(input, payload, generationId);
    if (image) return image;

    if (isFailedStatus(payload)) {
      throw new VehicleAiStudioProviderError(
        "Hedra image generation failed.",
        502,
        {
          ...previewPayload(payload),
          phase: "status",
          provider: "hedra",
          ...(generationId ? { providerGenerationId: generationId } : {}),
          ...readGenerationProgressDetails(payload),
        },
      );
    }
  }

  throw generationTimeoutError(
    lastPayload,
    generationId,
    input.pollIntervalMs * input.pollMaxAttempts,
  );
}

async function resolveImageReference(
  input: ResolveGeneratedImageInput,
  payload: unknown,
  generationId: string | null,
) {
  const directImage = extractGeneratedImage(payload);
  if (directImage) {
    return downloadGeneratedImage(input.fetch, directImage, {
      providerGenerationId: generationId,
      requestTimeoutMs: input.requestTimeoutMs,
    });
  }

  if (!isCompletedStatus(payload)) return null;

  return resolveGeneratedAssetImage({
    apiKey: input.apiKey,
    assetPath: input.assetPath,
    authHeader: input.authHeader,
    authScheme: input.authScheme,
    baseUrl: input.baseUrl,
    fetch: input.fetch,
    generationId,
    payload,
    requestTimeoutMs: input.requestTimeoutMs,
  });
}

async function fetchGenerationStatus(
  input: ResolveGeneratedImageInput,
  statusUrl: string,
) {
  const response = await fetchWithTimeout(
    input.fetch,
    statusUrl,
    {
      headers: {
        [input.authHeader]: authValue(
          input.authHeader,
          input.authScheme,
          input.apiKey,
        ),
      },
      method: "GET",
    },
    { phase: "status", requestTimeoutMs: input.requestTimeoutMs },
  );
  if (!response.ok) {
    throw await createProviderHttpError(response, {
      phase: "status",
      url: statusUrl,
    });
  }
  return (await response.json()) as unknown;
}

function noImageResultError(
  payload: unknown,
  phase: "generation" | "status",
  generationId: string | null,
) {
  return new VehicleAiStudioProviderError(
    "Hedra image generation returned no image result.",
    502,
    {
      ...previewPayload(payload),
      phase,
      provider: "hedra",
      ...(generationId ? { providerGenerationId: generationId } : {}),
    },
  );
}

function generationTimeoutError(
  payload: unknown,
  generationId: string | null,
  timeoutMs: number,
) {
  const progressDetails = readGenerationProgressDetails(payload);
  const providerGenerationStatus =
    progressDetails.providerGenerationStatus?.toLowerCase();
  const providerAssetId = readGeneratedAssetId(payload);
  return new VehicleAiStudioProviderError(
    providerGenerationStatus === "queued"
      ? "Hedra image generation stayed queued and timed out."
      : "Hedra image generation timed out.",
    503,
    {
      ...previewPayload(payload),
      phase: "status",
      provider: "hedra",
      ...(generationId ? { providerGenerationId: generationId } : {}),
      ...(providerAssetId ? { providerAssetId } : {}),
      ...progressDetails,
      timeoutMs,
    },
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
