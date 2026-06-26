import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { VehicleMediaKind } from "../../ports/vehicleInventoryRepository.js";
import type { VehicleMediaUpload } from "../../ports/vehicleMediaStorage.js";
import {
  auditVehicleServiceEvent,
  findScopedListing,
  findScopedUnitById,
  getListingRepository,
  getMediaStorage,
  getUnitRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.create";

export type RequestVehicleMediaUploadInput = {
  contentType: string;
  fileName: string;
  kind: VehicleMediaKind;
  sizeBytes: number;
  unitId: string;
};

export async function requestVehicleMediaUpload(
  context: ServiceContext,
  input: RequestVehicleMediaUploadInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleMediaUpload> {
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
  const scope = requireStoreScope(context);

  logVehicleServiceEvent(context, "vehicle_media.upload.requested", {
    contentType: input.contentType,
    kind: input.kind,
    listingId: listing.id,
    sizeBytes: input.sizeBytes,
    unitId: unit.id,
  });

  const upload = await getMediaStorage(ports).createUpload({
    contentType: input.contentType,
    fileName: input.fileName,
    scopeSegments: createVehicleObjectScope(scope, unit.id, input.kind),
    sizeBytes: input.sizeBytes,
  });

  await auditVehicleServiceEvent(context, {
    action: "vehicle_media.upload.request",
    category: "data_change",
    entityId: unit.id,
    entityType: "vehicle_unit",
    metadata: {
      kind: input.kind,
      listingId: listing.id,
      sizeBytes: input.sizeBytes,
      storageKey: upload.storageKey,
      unitId: unit.id,
      uploadCorrelationId: context.requestId,
    },
    permission,
    relatedEntities: [{ id: listing.id, type: "vehicle_listing" }],
    summary: "Requested vehicle media upload URL",
  });

  return upload;
}

function requireStoreScope(context: ServiceContext) {
  if (!context.storeId || !context.tenantId) {
    throw new Error("Vehicle media upload requires tenant and store scope.");
  }

  return { storeId: context.storeId, tenantId: context.tenantId };
}

function createVehicleObjectScope(
  scope: { storeId: string; tenantId: string },
  unitId: string,
  category: string,
) {
  return [
    "tenants",
    scope.tenantId,
    "stores",
    scope.storeId,
    "units",
    unitId,
    category,
  ];
}
