import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { VehicleMedia } from "../../ports/vehicleInventoryRepository.js";
import {
  auditVehicleServiceEvent,
  findScopedMedia,
  findScopedUnitById,
  getMediaRepository,
  getMediaStorage,
  getUnitRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.media_delete";

export type DeleteVehicleMediaInput = {
  mediaId: string;
  unitId: string;
};

export async function deleteVehicleMedia(
  context: ServiceContext,
  input: DeleteVehicleMediaInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleMedia> {
  assertPermission(context, permission);
  const unit = await findScopedUnitById(
    context,
    getUnitRepository(ports),
    input.unitId,
  );
  const repository = getMediaRepository(ports);
  const media = await findScopedMedia(context, repository, input);

  logVehicleServiceEvent(context, "vehicle_media.delete.started", {
    mediaId: input.mediaId,
    unitId: input.unitId,
  });

  const deleted = await repository.delete({
    ...media,
    updatedAt: new Date(),
  });
  const objectCleanup = await deleteStorageObject(
    context,
    ports,
    deleted.storageKey,
    {
      mediaId: deleted.id,
      unitId: input.unitId,
    },
  );

  await auditVehicleServiceEvent(context, {
    action: "vehicle_media.delete",
    category: "data_change",
    changes: [{ after: true, before: false, path: "media.isDeleted" }],
    entityId: deleted.id,
    entityType: "vehicle_media",
    metadata: {
      listingId: unit.listingId,
      objectCleanup: objectCleanup.status,
      ...(objectCleanup.errorMessage
        ? { objectCleanupError: objectCleanup.errorMessage }
        : {}),
      storageKey: deleted.storageKey,
      unitId: input.unitId,
    },
    permission,
    relatedEntities: [
      { id: input.unitId, type: "vehicle_unit" },
      { id: unit.listingId, type: "vehicle_listing" },
    ],
    summary: "Deleted vehicle media",
  });

  return deleted;
}

async function deleteStorageObject(
  context: ServiceContext,
  ports: VehicleInventoryServicePorts | undefined,
  storageKey: string,
  metadata: { mediaId: string; unitId: string },
): Promise<ObjectCleanupResult> {
  const deleteObject = getMediaStorage(ports).deleteObject;
  if (!deleteObject) return { status: "unsupported" };
  try {
    await deleteObject({ storageKey });
    return { status: "deleted" };
  } catch (error) {
    const message = errorMessage(error);
    context.logger.warn(
      "vehicle_media.object_cleanup.failed",
      createServiceLogMetadata(context, {
        errorMessage: message,
        mediaId: metadata.mediaId,
        storageKey,
        unitId: metadata.unitId,
      }),
    );
    return { errorMessage: message, status: "failed" };
  }
}

type ObjectCleanupResult =
  | { errorMessage?: never; status: "deleted" | "unsupported" }
  | { errorMessage: string; status: "failed" };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
