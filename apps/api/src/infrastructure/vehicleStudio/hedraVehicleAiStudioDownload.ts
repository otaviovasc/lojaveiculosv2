import type { GeneratedVehicleAiStudioImage } from "../../domains/vehicle/ports/vehicleAiStudioProvider.js";
import { VehicleAiStudioProviderError } from "../../domains/vehicle/ports/vehicleAiStudioProvider.js";
import type { HedraGeneratedImageReference } from "./hedraVehicleAiStudioPayloadFields.js";
import {
  createProviderHttpError,
  fetchWithTimeout,
} from "./hedraVehicleAiStudioHttp.js";

export async function downloadGeneratedImage(
  fetch: typeof globalThis.fetch,
  image: HedraGeneratedImageReference,
  input: {
    providerGenerationId?: string | null;
    requestTimeoutMs: number;
  },
): Promise<GeneratedVehicleAiStudioImage> {
  if (image.base64) {
    return {
      bytes: Uint8Array.from(Buffer.from(cleanBase64(image.base64), "base64")),
      contentType: image.contentType ?? "image/png",
      providerGenerationId: input.providerGenerationId ?? null,
      providerImageUrl: image.url ?? null,
    };
  }

  if (!image.url) {
    throw new VehicleAiStudioProviderError(
      "Hedra image generation returned an invalid image.",
      502,
    );
  }

  const response = await fetchWithTimeout(
    fetch,
    image.url,
    {},
    {
      phase: "download",
      requestTimeoutMs: input.requestTimeoutMs,
    },
  );
  if (!response.ok) {
    throw await createProviderHttpError(response, {
      phase: "download",
      url: image.url,
    });
  }

  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    contentType:
      response.headers.get("content-type") ?? image.contentType ?? "image/png",
    providerGenerationId: input.providerGenerationId ?? null,
    providerImageUrl: image.url,
  };
}

function cleanBase64(value: string) {
  return value.includes(",") ? (value.split(",").at(-1) ?? value) : value;
}
