import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { VehicleAiStudioTemplateId } from "../../ports/vehicleAiStudioProvider.js";
import { VehicleAiStudioProviderError } from "../../ports/vehicleAiStudioProvider.js";
import {
  auditVehicleServiceEvent,
  findScopedListing,
  findScopedMedia,
  findScopedUnitById,
  getListingRepository,
  getMediaRepository,
  getMediaStorage,
  getUnitRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";
import { getVehicleAiStudioTemplate } from "../../aiStudioTemplates.js";

const permission = "inventory.ai_studio_generate";
const hedraModel = "flux_2_pro" as const;
const generationMode = "image-to-image/inpainting" as const;
const promptStrength = 0.75;
const creditsPerGeneration = 4;

export type GenerateVehicleAiStudioImageInput = {
  mediaId: string;
  templateId: VehicleAiStudioTemplateId;
  unitId: string;
};

export type VehicleAiStudioGenerationResult = {
  beforeUrl: string;
  credits: number;
  generatedStorageKey: string;
  generatedUrl: string;
  guidance: number;
  mediaId: string;
  model: typeof hedraModel;
  providerGenerationId?: string | null;
  sourceStorageKey: string;
  strength: number;
  templateId: VehicleAiStudioTemplateId;
  unitId: string;
};

export async function generateVehicleAiStudioImage(
  context: ServiceContext,
  input: GenerateVehicleAiStudioImageInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleAiStudioGenerationResult> {
  assertPermission(context, permission);
  const unit = await findScopedUnitById(
    context,
    getUnitRepository(ports),
    input.unitId,
  );
  const listing = await findScopedListing(
    context,
    getListingRepository(ports),
    unit.listingId,
  );
  const sourceMedia = await findScopedMedia(
    context,
    getMediaRepository(ports),
    input,
  );
  if (sourceMedia.kind !== "photo") {
    throw new VehicleAiStudioValidationError(
      "AI studio can only process vehicle photos.",
    );
  }

  const provider = ports?.aiStudioProvider;
  if (!provider) {
    throw new VehicleAiStudioProviderError(
      "Vehicle AI studio provider is not configured.",
      503,
    );
  }

  const template = getVehicleAiStudioTemplate(input.templateId);

  logVehicleServiceEvent(context, "vehicle_ai_studio.generate.started", {
    listingId: listing.id,
    mediaId: sourceMedia.id,
    model: hedraModel,
    sourceMediaDisplayOrder: sourceMedia.displayOrder,
    sourceMediaFileExtension: fileExtensionFromStorageKey(
      sourceMedia.storageKey,
    ),
    templateId: template.id,
    unitId: unit.id,
  });

  const generated = await generateWithProvider(context, {
    listingId: listing.id,
    provider,
    sourceMediaDisplayOrder: sourceMedia.displayOrder,
    sourceMediaFileExtension: fileExtensionFromStorageKey(
      sourceMedia.storageKey,
    ),
    sourceImageUrl: sourceMedia.url,
    sourceMediaId: sourceMedia.id,
    templateId: template.id,
    unitId: unit.id,
  });

  const stored = await getMediaStorage(ports).putObject({
    body: generated.bytes,
    contentType: generated.contentType || "image/png",
    fileName: generatedFileName(template.id, generated.contentType),
    scopeSegments: createAiStudioObjectScope(context, unit.id),
  });

  await auditVehicleServiceEvent(context, {
    action: "vehicle_ai_studio.generate",
    category: "integration",
    entityId: sourceMedia.id,
    entityType: "vehicle_media",
    metadata: {
      credits: creditsPerGeneration,
      generatedStorageKey: stored.storageKey,
      listingId: listing.id,
      model: hedraModel,
      providerGenerationId: generated.providerGenerationId ?? null,
      templateId: template.id,
      unitId: unit.id,
    },
    permission,
    provider: generated.providerGenerationId
      ? { name: "hedra", requestId: generated.providerGenerationId }
      : { name: "hedra" },
    relatedEntities: [
      { id: unit.id, type: "vehicle_unit" },
      { id: listing.id, type: "vehicle_listing" },
    ],
    summary: "Generated vehicle studio image with AI",
  });

  return {
    beforeUrl: sourceMedia.url,
    credits: creditsPerGeneration,
    generatedStorageKey: stored.storageKey,
    generatedUrl: stored.publicUrl,
    guidance: promptStrength,
    mediaId: sourceMedia.id,
    model: hedraModel,
    providerGenerationId: generated.providerGenerationId ?? null,
    sourceStorageKey: sourceMedia.storageKey,
    strength: promptStrength,
    templateId: template.id,
    unitId: unit.id,
  };
}

export class VehicleAiStudioValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VehicleAiStudioValidationError";
  }
}

async function generateWithProvider(
  context: ServiceContext,
  input: {
    listingId: string;
    provider: NonNullable<VehicleInventoryServicePorts["aiStudioProvider"]>;
    sourceMediaDisplayOrder: number;
    sourceMediaFileExtension: string | null;
    sourceImageUrl: string;
    sourceMediaId: string;
    templateId: VehicleAiStudioTemplateId;
    unitId: string;
  },
) {
  try {
    return await input.provider.generateImage({
      guidance: promptStrength,
      mode: generationMode,
      model: hedraModel,
      prompt: getVehicleAiStudioTemplate(input.templateId).prompt,
      sourceImageUrl: input.sourceImageUrl,
      strength: promptStrength,
      templateId: input.templateId,
    });
  } catch (error) {
    if (error instanceof VehicleAiStudioProviderError) {
      context.logger.error(
        "vehicle_ai_studio.provider.failed",
        createServiceLogMetadata(context, {
          errorMessage: error.message,
          listingId: input.listingId,
          mediaId: input.sourceMediaId,
          model: hedraModel,
          sourceMediaDisplayOrder: input.sourceMediaDisplayOrder,
          sourceMediaFileExtension: input.sourceMediaFileExtension,
          templateId: input.templateId,
          unitId: input.unitId,
          ...(error.details ?? {}),
        }),
      );
    }
    throw error;
  }
}

export function createAiStudioObjectScope(
  context: ServiceContext,
  unitId: string,
) {
  if (!context.tenantId || !context.storeId) {
    throw new Error("Vehicle AI studio requires tenant and store scope.");
  }

  return [
    "tenants",
    context.tenantId,
    "stores",
    context.storeId,
    "units",
    unitId,
    "ai-studio",
  ];
}

function generatedFileName(
  templateId: VehicleAiStudioTemplateId,
  contentType: string,
) {
  return `ai-studio-${templateId}.${extensionForContentType(contentType)}`;
}

function extensionForContentType(contentType: string) {
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("webp")) return "webp";
  return "png";
}

function fileExtensionFromStorageKey(storageKey: string) {
  const fileName = storageKey.split("/").at(-1) ?? "";
  const extension = fileName.split(".").at(-1)?.toLowerCase();
  return extension && extension !== fileName ? extension : null;
}
