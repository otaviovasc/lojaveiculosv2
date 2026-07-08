import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { VehicleAiStudioTemplateId } from "../../ports/vehicleAiStudioProvider.js";
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
import { createAiStudioObjectScope } from "./generateVehicleAiStudioImage.js";
import { getVehicleAiStudioTemplate } from "../../aiStudioTemplates.js";

const permission = "inventory.ai_studio_generate";

export type ApproveVehicleAiStudioImageInput = {
  generatedStorageKey: string;
  mediaId: string;
  templateId: VehicleAiStudioTemplateId;
  unitId: string;
};

export async function approveVehicleAiStudioImage(
  context: ServiceContext,
  input: ApproveVehicleAiStudioImageInput,
  ports?: VehicleInventoryServicePorts,
) {
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
  const template = getVehicleAiStudioTemplate(input.templateId);
  assertGeneratedStorageScope(context, unit.id, input.generatedStorageKey);

  logVehicleServiceEvent(context, "vehicle_ai_studio.approve.started", {
    generatedStorageKey: input.generatedStorageKey,
    listingId: listing.id,
    sourceMediaId: sourceMedia.id,
    templateId: template.id,
    unitId: unit.id,
  });

  const repository = getMediaRepository(ports);
  const existingMedia = await repository.listByUnitIds({
    storeId: context.storeId,
    tenantId: context.tenantId,
    unitIds: [unit.id],
  });
  const displayOrder =
    Math.max(-1, ...existingMedia.map((item) => item.displayOrder)) + 1;
  const media = await repository.create({
    altText: `Estúdio Digital IA - ${template.label}`,
    displayOrder,
    isPublic: true,
    kind: "photo",
    storageKey: input.generatedStorageKey,
    storeId: context.storeId,
    tenantId: context.tenantId,
    unitId: unit.id,
    url: getMediaStorage(ports).getPublicUrl(input.generatedStorageKey),
  });

  await auditVehicleServiceEvent(context, {
    action: "vehicle_ai_studio.approve",
    category: "data_change",
    entityId: media.id,
    entityType: "vehicle_media",
    metadata: {
      generatedStorageKey: media.storageKey,
      listingId: listing.id,
      sourceMediaId: sourceMedia.id,
      templateId: template.id,
      unitId: unit.id,
    },
    permission,
    relatedEntities: [
      { id: sourceMedia.id, type: "vehicle_media" },
      { id: unit.id, type: "vehicle_unit" },
      { id: listing.id, type: "vehicle_listing" },
    ],
    summary: "Approved AI studio image and attached it to vehicle gallery",
  });

  return media;
}

export class VehicleAiStudioStorageScopeError extends Error {
  constructor() {
    super("Vehicle AI studio storage key is outside the scoped unit folder.");
    this.name = "VehicleAiStudioStorageScopeError";
  }
}

function assertGeneratedStorageScope(
  context: ServiceContext,
  unitId: string,
  storageKey: string,
) {
  const expectedPrefix = `${createAiStudioObjectScope(context, unitId).join("/")}/`;
  if (!storageKey.startsWith(expectedPrefix)) {
    throw new VehicleAiStudioStorageScopeError();
  }
}
