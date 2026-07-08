import type { GeneratedVehicleAiStudioImage } from "../../domains/vehicle/ports/vehicleAiStudioProvider.js";
import { downloadGeneratedImage } from "./hedraVehicleAiStudioDownload.js";
import {
  authValue,
  createProviderHttpError,
  fetchWithTimeout,
  toUrl,
} from "./hedraVehicleAiStudioHttp.js";
import {
  extractGeneratedImage,
  readGeneratedAssetId,
} from "./hedraVehicleAiStudioPayloadFields.js";

export async function resolveGeneratedAssetImage(input: {
  apiKey: string;
  assetPath: string;
  authHeader: string;
  authScheme: string;
  baseUrl: string;
  fetch: typeof globalThis.fetch;
  generationId: string | null;
  payload: unknown;
  requestTimeoutMs: number;
}): Promise<GeneratedVehicleAiStudioImage | null> {
  const assetId = readGeneratedAssetId(input.payload);
  if (!assetId) return null;

  const listUrl = assetListUrl(input.baseUrl, input.assetPath, assetId);
  const response = await fetchWithTimeout(
    input.fetch,
    listUrl,
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
    { phase: "asset-list", requestTimeoutMs: input.requestTimeoutMs },
  );
  if (!response.ok) {
    throw await createProviderHttpError(response, {
      phase: "asset-list",
      url: listUrl,
    });
  }

  const payload = (await response.json()) as unknown;
  const image = extractGeneratedImage(payload);
  if (image) {
    return downloadGeneratedImage(input.fetch, image, {
      providerGenerationId: input.generationId,
      requestTimeoutMs: input.requestTimeoutMs,
    });
  }

  return null;
}

function assetListUrl(baseUrl: string, path: string, assetId: string) {
  const url = new URL(toUrl(baseUrl, path));
  url.searchParams.set("type", "image");
  url.searchParams.set("ids", assetId);
  return url.toString();
}
