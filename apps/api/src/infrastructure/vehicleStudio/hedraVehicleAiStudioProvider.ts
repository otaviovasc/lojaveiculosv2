import type {
  GenerateVehicleAiStudioProviderInput,
  VehicleAiStudioProvider,
} from "../../domains/vehicle/ports/vehicleAiStudioProvider.js";
import { VehicleAiStudioProviderError } from "../../domains/vehicle/ports/vehicleAiStudioProvider.js";
import { uploadHedraSourceImageAsset } from "./hedraVehicleAiStudioAssets.js";
import { resolveGeneratedImage } from "./hedraVehicleAiStudioProviderPayload.js";
import {
  authValue,
  createProviderHttpError,
  fetchWithTimeout,
  toUrl,
} from "./hedraVehicleAiStudioHttp.js";

const defaultBaseUrl = "https://api.hedra.com";
const defaultImagePath = "/web-app/public/generations";
const defaultStatusPath = "/web-app/public/generations/{id}/status";
const defaultAssetPath = "/web-app/public/assets";
const defaultUploadAssetPath = "/web-app/public/assets/{id}/upload";
const defaultAuthHeader = "X-API-Key";
const defaultAuthScheme = "";
const defaultFlux2ProModelId = "64795e67-412b-4d57-a24c-526cf909227d";
const defaultPollIntervalMs = 1500;
const defaultPollMaxAttempts = 120;
const defaultRequestTimeoutMs = 60000;

export type HedraVehicleAiStudioProviderOptions = {
  apiKey?: string;
  assetPath?: string;
  authHeader?: string;
  authScheme?: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  flux2ProModelId?: string;
  imagePath?: string;
  pollIntervalMs?: number;
  pollMaxAttempts?: number;
  requestTimeoutMs?: number;
  statusPath?: string;
  uploadAssetPath?: string;
};

export function createHedraVehicleAiStudioProvider({
  apiKey,
  assetPath = defaultAssetPath,
  authHeader = defaultAuthHeader,
  authScheme = defaultAuthScheme,
  baseUrl = defaultBaseUrl,
  fetch = globalThis.fetch,
  flux2ProModelId = defaultFlux2ProModelId,
  imagePath = defaultImagePath,
  pollIntervalMs = defaultPollIntervalMs,
  pollMaxAttempts = defaultPollMaxAttempts,
  requestTimeoutMs = defaultRequestTimeoutMs,
  statusPath = defaultStatusPath,
  uploadAssetPath = defaultUploadAssetPath,
}: HedraVehicleAiStudioProviderOptions = {}): VehicleAiStudioProvider {
  return {
    async generateImage(input) {
      if (!apiKey) {
        throw new VehicleAiStudioProviderError(
          "HEDRA_API_KEY is not configured.",
          503,
        );
      }

      const sourceImageAssetId = await uploadHedraSourceImageAsset({
        apiKey,
        assetPath,
        authHeader,
        authScheme,
        baseUrl,
        fetch,
        requestTimeoutMs,
        sourceImageUrl: input.sourceImageUrl,
        uploadAssetPath,
      });

      const url = toUrl(baseUrl, imagePath);
      const response = await fetchWithTimeout(
        fetch,
        url,
        {
          body: JSON.stringify(
            createRequestBody(input, {
              aiModelId: flux2ProModelId,
              sourceImageAssetId,
            }),
          ),
          headers: {
            [authHeader]: authValue(authHeader, authScheme, apiKey),
            "Content-Type": "application/json",
          },
          method: "POST",
        },
        { phase: "generation", requestTimeoutMs },
      );
      if (!response.ok) {
        throw await createProviderHttpError(response, {
          phase: "generation",
          url,
        });
      }

      const payload: unknown = await response.json();
      return resolveGeneratedImage({
        apiKey,
        assetPath,
        authHeader,
        authScheme,
        baseUrl,
        fetch,
        input,
        payload,
        pollIntervalMs,
        pollMaxAttempts,
        requestTimeoutMs,
        ...(statusPath ? { statusPath } : {}),
      });
    },
  };
}

export function createHedraVehicleAiStudioProviderFromEnv(
  env: Record<string, string | undefined>,
): VehicleAiStudioProvider {
  return createHedraVehicleAiStudioProvider({
    ...(env.HEDRA_API_KEY ? { apiKey: env.HEDRA_API_KEY } : {}),
    ...(env.HEDRA_AUTH_HEADER ? { authHeader: env.HEDRA_AUTH_HEADER } : {}),
    ...(env.HEDRA_AUTH_SCHEME ? { authScheme: env.HEDRA_AUTH_SCHEME } : {}),
    ...(env.HEDRA_API_BASE_URL ? { baseUrl: env.HEDRA_API_BASE_URL } : {}),
    ...(env.HEDRA_ASSET_PATH ? { assetPath: env.HEDRA_ASSET_PATH } : {}),
    ...(env.HEDRA_ASSET_UPLOAD_PATH
      ? { uploadAssetPath: env.HEDRA_ASSET_UPLOAD_PATH }
      : {}),
    ...(env.HEDRA_FLUX_2_PRO_MODEL_ID
      ? { flux2ProModelId: env.HEDRA_FLUX_2_PRO_MODEL_ID }
      : {}),
    ...(env.HEDRA_IMAGE_TO_IMAGE_PATH
      ? { imagePath: env.HEDRA_IMAGE_TO_IMAGE_PATH }
      : {}),
    ...(env.HEDRA_GENERATION_STATUS_PATH
      ? { statusPath: env.HEDRA_GENERATION_STATUS_PATH }
      : {}),
    pollIntervalMs: readPositiveNumber(
      env.HEDRA_POLL_INTERVAL_MS,
      defaultPollIntervalMs,
    ),
    pollMaxAttempts: readPositiveNumber(
      env.HEDRA_POLL_MAX_ATTEMPTS,
      defaultPollMaxAttempts,
    ),
    requestTimeoutMs: readPositiveNumber(
      env.HEDRA_REQUEST_TIMEOUT_MS,
      defaultRequestTimeoutMs,
    ),
  });
}

function createRequestBody(
  input: GenerateVehicleAiStudioProviderInput,
  options: { aiModelId: string; sourceImageAssetId: string },
) {
  return {
    ai_model_id: options.aiModelId,
    aspect_ratio: "16:9",
    resolution: "1080p",
    start_keyframe_id: options.sourceImageAssetId,
    text_prompt: input.prompt,
    type: "image_to_image",
  };
}

function readPositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
