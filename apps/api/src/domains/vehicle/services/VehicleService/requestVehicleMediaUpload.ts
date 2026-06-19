import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { VehicleMediaKind } from "../../ports/vehicleInventoryRepository.js";
import type { VehicleMediaUpload } from "../../ports/vehicleMediaStorage.js";
import {
  auditVehicleServiceEvent,
  findScopedListing,
  getListingRepository,
  getMediaStorage,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.create";

export type RequestVehicleMediaUploadInput = {
  contentType: string;
  fileName: string;
  kind: VehicleMediaKind;
  listingId: string;
  sizeBytes: number;
};

export async function requestVehicleMediaUpload(
  context: ServiceContext,
  input: RequestVehicleMediaUploadInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleMediaUpload> {
  assertPermission(context, permission);
  const listing = await findScopedListing(
    context,
    getListingRepository(ports),
    input.listingId,
  );
  const scope = requireStoreScope(context);

  logVehicleServiceEvent(context, "vehicle_media.upload.requested", {
    contentType: input.contentType,
    kind: input.kind,
    listingId: listing.id,
    sizeBytes: input.sizeBytes,
  });

  const upload = await getMediaStorage(ports).createUpload({
    contentType: input.contentType,
    fileName: input.fileName,
    scopeSegments: createVehicleObjectScope(scope, listing.id, input.kind),
    sizeBytes: input.sizeBytes,
  });

  await auditVehicleServiceEvent(context, {
    action: "vehicle_media.upload.request",
    category: "data_change",
    entityId: listing.id,
    metadata: {
      kind: input.kind,
      listingId: listing.id,
      sizeBytes: input.sizeBytes,
      storageKey: upload.storageKey,
      uploadCorrelationId: context.requestId,
    },
    permission,
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
  listingId: string,
  category: string,
) {
  return [
    "tenants",
    scope.tenantId,
    "stores",
    scope.storeId,
    "listings",
    listingId,
    category,
  ];
}
