import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  VehicleAiStudioProviderError,
  type GenerateVehicleAiStudioProviderInput,
} from "../../ports/vehicleAiStudioProvider.js";
import type {
  VehicleMedia,
  VehicleUnit,
} from "../../ports/vehicleInventoryRepository.js";
import { approveVehicleAiStudioImage } from "./approveVehicleAiStudioImage.js";
import { generateVehicleAiStudioImage } from "./generateVehicleAiStudioImage.js";
import {
  createContext,
  createInMemoryVehiclePorts,
  createListing,
  testNow,
  type TestVehicleInventoryPorts,
} from "./testSupport.js";

describe("vehicle AI studio service", () => {
  let generatedProviderCalls: GenerateVehicleAiStudioProviderInput[];
  let ports: TestVehicleInventoryPorts;

  beforeEach(() => {
    const listing = createListing({ id: "listing_1", unitIds: ["unit_1"] });
    generatedProviderCalls = [];
    ports = createInMemoryVehiclePorts([listing]);
    ports.units.set("unit_1", unit());
    ports.media.set("media_1", media({ displayOrder: 2, id: "media_1" }));
    ports.aiStudioProvider = {
      generateImage: vi.fn(
        async (input: GenerateVehicleAiStudioProviderInput) => {
          generatedProviderCalls.push(input);
          return {
            bytes: new Uint8Array([1, 2, 3]),
            contentType: "image/png",
            providerGenerationId: "hedra_generation_1",
          };
        },
      ),
    };
  });

  it("generates a scoped preview with the selected backend prompt", async () => {
    const context = createContext(["inventory.ai_studio_generate"]);

    const result = await generateVehicleAiStudioImage(
      context,
      {
        mediaId: "media_1",
        templateId: "industrial_garage",
        unitId: "unit_1",
      },
      ports,
    );

    expect(generatedProviderCalls[0]).toMatchObject({
      guidance: 0.75,
      mode: "image-to-image/inpainting",
      model: "flux_2_pro",
      sourceImageUrl: "https://cdn.local/front.jpg",
      strength: 0.75,
      templateId: "industrial_garage",
    });
    expect(generatedProviderCalls[0]?.prompt).toContain("industrial garage");
    expect(generatedProviderCalls[0]?.prompt).toContain(
      "protected frozen foreground layer",
    );
    expect(result).toMatchObject({
      beforeUrl: "https://cdn.local/front.jpg",
      credits: 4,
      generatedUrl:
        "https://cdn.local/tenants/tenant_1/stores/store_1/units/unit_1/ai-studio/ai-studio-industrial_garage.png",
      guidance: 0.75,
      model: "flux_2_pro",
      strength: 0.75,
    });
    expect(context.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "vehicle_ai_studio.generate",
        category: "integration",
      }),
    );
  });

  it("approves the generated object into the vehicle gallery", async () => {
    const context = createContext(["inventory.ai_studio_generate"]);

    const detail = await approveVehicleAiStudioImage(
      context,
      {
        generatedStorageKey:
          "tenants/tenant_1/stores/store_1/units/unit_1/ai-studio/output.png",
        mediaId: "media_1",
        templateId: "premium_studio",
        unitId: "unit_1",
      },
      ports,
    );

    expect(detail).toMatchObject({
      altText: "Estúdio Digital IA - Estúdio Premium",
      displayOrder: 3,
      kind: "photo",
      url: "https://cdn.local/tenants/tenant_1/stores/store_1/units/unit_1/ai-studio/output.png",
    });
    expect(context.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "vehicle_ai_studio.approve",
        category: "data_change",
      }),
    );
  });

  it("requires the AI studio permission before calling Hedra", async () => {
    await expect(
      generateVehicleAiStudioImage(
        createContext(["inventory.read"]),
        {
          mediaId: "media_1",
          templateId: "premium_studio",
          unitId: "unit_1",
        },
        ports,
      ),
    ).rejects.toThrow("Missing permission: inventory.ai_studio_generate");

    expect(generatedProviderCalls).toHaveLength(0);
  });

  it("logs sanitized Hedra provider details when generation fails", async () => {
    const context = createContext(["inventory.ai_studio_generate"]);
    ports.aiStudioProvider = {
      generateImage: vi.fn(async () => {
        throw new VehicleAiStudioProviderError(
          "Hedra image generation failed with status 402.",
          503,
          {
            phase: "generation",
            provider: "hedra",
            providerResponseBody: '{"error":"insufficient credits"}',
            providerStatus: 402,
            urlHost: "api.hedra.com",
            urlPath: "/web-app/public/generations",
          },
        );
      }),
    };

    await expect(
      generateVehicleAiStudioImage(
        context,
        {
          mediaId: "media_1",
          templateId: "premium_studio",
          unitId: "unit_1",
        },
        ports,
      ),
    ).rejects.toThrow("Hedra image generation failed with status 402.");

    expect(context.logger.error).toHaveBeenCalledWith(
      "vehicle_ai_studio.provider.failed",
      expect.objectContaining({
        mediaId: "media_1",
        phase: "generation",
        provider: "hedra",
        providerResponseBody: '{"error":"insufficient credits"}',
        providerStatus: 402,
        requestId: "req_1",
        sourceMediaDisplayOrder: 2,
        sourceMediaFileExtension: "jpg",
        urlHost: "api.hedra.com",
      }),
    );
  });
});

function unit(input: Partial<VehicleUnit> = {}): VehicleUnit {
  return {
    colorName: null,
    createdAt: testNow,
    id: "unit_1",
    listingId: "listing_1",
    plate: "ABC1D23",
    status: "available",
    stockNumber: null,
    storeId: "store_1",
    tenantId: "tenant_1",
    updatedAt: testNow,
    vin: null,
    ...input,
  };
}

function media(input: Partial<VehicleMedia> = {}): VehicleMedia {
  return {
    altText: null,
    createdAt: testNow,
    displayOrder: 0,
    id: "media_1",
    isPublic: true,
    kind: "photo",
    storageKey: "tenants/tenant_1/stores/store_1/units/unit_1/photo/front.jpg",
    storeId: "store_1",
    tenantId: "tenant_1",
    unitId: "unit_1",
    updatedAt: testNow,
    url: "https://cdn.local/front.jpg",
    ...input,
  };
}
