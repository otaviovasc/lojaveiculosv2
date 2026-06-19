import type { AuditFieldChange } from "@lojaveiculosv2/audit";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { VehicleMedia } from "../../ports/vehicleInventoryRepository.js";
import {
  auditVehicleServiceEvent,
  findScopedListing,
  findScopedMedia,
  getListingRepository,
  getMediaRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.media_update";

export type UpdateVehicleMediaInput = {
  altText?: string | null;
  displayOrder?: number;
  isPublic?: boolean;
  listingId: string;
  mediaId: string;
};

export async function updateVehicleMedia(
  context: ServiceContext,
  input: UpdateVehicleMediaInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleMedia> {
  assertPermission(context, permission);
  await findScopedListing(
    context,
    getListingRepository(ports),
    input.listingId,
  );
  const repository = getMediaRepository(ports);
  const media = await findScopedMedia(context, repository, input);
  const changes = createChanges(media, input);

  logVehicleServiceEvent(context, "vehicle_media.update.started", {
    changedFields: changes.map((change) => change.path),
    listingId: input.listingId,
    mediaId: input.mediaId,
  });

  const updated = changes.length
    ? await repository.save({
        ...media,
        ...(input.altText !== undefined ? { altText: input.altText } : {}),
        ...(input.displayOrder !== undefined
          ? { displayOrder: input.displayOrder }
          : {}),
        ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
        updatedAt: new Date(),
      })
    : media;

  await auditVehicleServiceEvent(context, {
    action: "vehicle_media.update",
    category: "data_change",
    changes,
    entityId: updated.id,
    entityType: "vehicle_media",
    metadata: {
      changedFields: changes.map((change) => change.path),
      listingId: input.listingId,
    },
    permission,
    relatedEntities: [{ id: input.listingId, type: "vehicle_listing" }],
    summary: "Updated vehicle media",
  });

  return updated;
}

function createChanges(
  media: VehicleMedia,
  input: UpdateVehicleMediaInput,
): AuditFieldChange[] {
  return [
    changeFor("media.altText", media.altText, input.altText),
    changeFor("media.displayOrder", media.displayOrder, input.displayOrder),
    changeFor("media.isPublic", media.isPublic, input.isPublic),
  ].filter((change): change is AuditFieldChange => Boolean(change));
}

function changeFor(
  path: string,
  before: boolean | number | string | null,
  after: boolean | number | string | null | undefined,
): AuditFieldChange | null {
  if (after === undefined || before === after) return null;
  return { after, before, path };
}
