import { describe, expect, it, vi } from "vitest";
import type { VehicleAiStudioProviderError } from "../../domains/vehicle/ports/vehicleAiStudioProvider.js";
import { createHedraVehicleAiStudioProvider } from "./hedraVehicleAiStudioProvider.js";

describe("createHedraVehicleAiStudioProvider", () => {
  it("uploads the source image asset and requests image-to-image generation", async () => {
    const fetcher = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if (url === "https://assets.local/source.jpg") {
          return imageResponse(new Uint8Array([9, 8, 7]), "image/jpeg");
        }
        if (url === "https://api.hedra.com/web-app/public/assets") {
          return jsonResponse({ id: "source_asset_1" });
        }
        if (
          url ===
          "https://api.hedra.com/web-app/public/assets/source_asset_1/upload"
        ) {
          expect(init?.body).toBeInstanceOf(FormData);
          return new Response(null, { status: 204 });
        }
        if (url.endsWith("/web-app/public/generations")) {
          return jsonResponse({ id: "generation_1" });
        }
        if (url.endsWith("/web-app/public/generations/generation_1/status")) {
          return jsonResponse({
            download_url: "https://assets.hedra.local/output.png",
            status: "complete",
          });
        }
        if (url === "https://assets.hedra.local/output.png") {
          return imageResponse(new Uint8Array([7, 8, 9]), "image/png");
        }
        return jsonResponse({ error: "unexpected request" }, 500);
      });

    const provider = createHedraVehicleAiStudioProvider({
      apiKey: "hedra-key",
      fetch: fetcher,
      flux2ProModelId: "flux-model-id",
      pollIntervalMs: 1,
    });

    const result = await provider.generateImage({
      guidance: 0.75,
      mode: "image-to-image/inpainting",
      model: "flux_2_pro",
      prompt: "Replace the background.",
      sourceImageUrl: "https://assets.local/source.jpg",
      strength: 0.75,
      templateId: "premium_studio",
    });

    expect(fetcher).toHaveBeenCalledTimes(6);
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://assets.local/source.jpg");
    expect(fetcher.mock.calls[1]?.[0]).toBe(
      "https://api.hedra.com/web-app/public/assets",
    );
    expect(fetcher.mock.calls[2]?.[0]).toBe(
      "https://api.hedra.com/web-app/public/assets/source_asset_1/upload",
    );
    expect(fetcher.mock.calls[3]?.[0]).toBe(
      "https://api.hedra.com/web-app/public/generations",
    );
    expect(fetcher.mock.calls[4]?.[0]).toBe(
      "https://api.hedra.com/web-app/public/generations/generation_1/status",
    );
    expect(fetcher.mock.calls[5]?.[0]).toBe(
      "https://assets.hedra.local/output.png",
    );
    expect(fetcher.mock.calls[1]?.[1]?.headers).toMatchObject({
      "Content-Type": "application/json",
      "X-API-Key": "hedra-key",
    });
    expect(fetcher.mock.calls[2]?.[1]?.headers).toMatchObject({
      "X-API-Key": "hedra-key",
    });
    expect(fetcher.mock.calls[3]?.[1]?.headers).toMatchObject({
      "Content-Type": "application/json",
      "X-API-Key": "hedra-key",
    });
    const generationBody = parseJsonObject(fetcher.mock.calls[3]?.[1]?.body);
    expect(generationBody).toMatchObject({
      ai_model_id: "flux-model-id",
      aspect_ratio: "16:9",
      resolution: "1080p",
      start_keyframe_id: "source_asset_1",
      text_prompt: "Replace the background.",
      type: "image_to_image",
    });
    expect(result).toMatchObject({
      contentType: "image/png",
      providerGenerationId: "generation_1",
      providerImageUrl: "https://assets.hedra.local/output.png",
    });
  });

  it("fails before source upload when Hedra is not configured", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>();
    const provider = createHedraVehicleAiStudioProvider({ fetch: fetcher });

    await expect(
      provider.generateImage({
        guidance: 0.75,
        mode: "image-to-image/inpainting",
        model: "flux_2_pro",
        prompt: "Replace the background.",
        sourceImageUrl: "https://assets.local/source.jpg",
        strength: 0.75,
        templateId: "premium_studio",
      }),
    ).rejects.toMatchObject({
      message: "HEDRA_API_KEY is not configured.",
      name: "VehicleAiStudioProviderError",
    } satisfies Partial<VehicleAiStudioProviderError>);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps Hedra generation progress when polling times out", async () => {
    const fetcher = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async (input) => {
        const url = String(input);
        if (url === "https://assets.local/source.jpg") {
          return imageResponse(new Uint8Array([9, 8, 7]), "image/jpeg");
        }
        if (url === "https://api.hedra.com/web-app/public/assets") {
          return jsonResponse({ id: "source_asset_1" });
        }
        if (
          url ===
          "https://api.hedra.com/web-app/public/assets/source_asset_1/upload"
        ) {
          return new Response(null, { status: 204 });
        }
        if (url.endsWith("/web-app/public/generations")) {
          return jsonResponse({ id: "generation_1" });
        }
        return jsonResponse({
          id: "generation_1",
          progress: 0.65,
          status: "processing",
        });
      });
    const provider = createHedraVehicleAiStudioProvider({
      apiKey: "hedra-key",
      fetch: fetcher,
      flux2ProModelId: "flux-model-id",
      pollIntervalMs: 1,
      pollMaxAttempts: 1,
    });

    await expect(
      provider.generateImage({
        guidance: 0.75,
        mode: "image-to-image/inpainting",
        model: "flux_2_pro",
        prompt: "Replace the background.",
        sourceImageUrl: "https://assets.local/source.jpg",
        strength: 0.75,
        templateId: "premium_studio",
      }),
    ).rejects.toMatchObject({
      details: {
        phase: "status",
        provider: "hedra",
        providerGenerationId: "generation_1",
        providerGenerationStatus: "processing",
        providerProgress: 0.65,
        providerResponseBody:
          '{"id":"generation_1","progress":0.65,"status":"processing"}',
        timeoutMs: 1,
      },
      name: "VehicleAiStudioProviderError",
    } satisfies Partial<VehicleAiStudioProviderError>);
  });
});

function imageResponse(bytes: Uint8Array, contentType: string, status = 200) {
  return new Response(toArrayBuffer(bytes), {
    headers: { "content-type": contentType },
    status,
  });
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function jsonResponse(
  payload: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json", ...headers },
    status,
  });
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  const parsed = JSON.parse(String(value)) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {};
}
