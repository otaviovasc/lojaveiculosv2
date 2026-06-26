import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { VehicleDocumentKind } from "../../ports/vehicleInventoryRepository.js";
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

const permission = "inventory.document_attach";

export type RequestVehicleDocumentUploadInput = {
  contentType: string;
  fileName: string;
  kind: VehicleDocumentKind;
  sizeBytes: number;
  unitId: string;
};

export async function requestVehicleDocumentUpload(
  context: ServiceContext,
  input: RequestVehicleDocumentUploadInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleMediaUpload> {
  assertPermission(context, permission);
  const target = await assertDocumentTarget(context, input, ports);
  const scope = requireStoreScope(context);

  logVehicleServiceEvent(context, "vehicle_document.upload.requested", {
    contentType: input.contentType,
    kind: input.kind,
    listingId: target.listing.id,
    sizeBytes: input.sizeBytes,
    targetType: "vehicle_unit",
  });

  const upload = await getMediaStorage(ports).createUpload({
    contentType: input.contentType,
    fileName: input.fileName,
    scopeSegments: createVehicleObjectScope(scope, target.unit.id, "documents"),
    sizeBytes: input.sizeBytes,
  });

  await auditVehicleServiceEvent(context, {
    action: "vehicle_document.upload.request",
    category: "data_change",
    entityId: target.unit.id,
    entityType: "vehicle_unit",
    metadata: {
      documentKind: input.kind,
      listingId: target.listing.id,
      sizeBytes: input.sizeBytes,
      storageKey: upload.storageKey,
      targetId: target.unit.id,
      targetType: "vehicle_unit",
      uploadCorrelationId: context.requestId,
    },
    permission,
    summary: "Requested vehicle document upload URL",
  });

  return upload;
}

async function assertDocumentTarget(
  context: ServiceContext,
  input: RequestVehicleDocumentUploadInput,
  ports?: VehicleInventoryServicePorts,
) {
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
  return { listing, unit };
}

function requireStoreScope(context: ServiceContext) {
  if (!context.storeId || !context.tenantId) {
    throw new Error("Vehicle document upload requires tenant and store scope.");
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
