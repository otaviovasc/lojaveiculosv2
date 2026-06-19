import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  VehicleDocumentKind,
  VehicleDocumentTargetType,
} from "../../ports/vehicleInventoryRepository.js";
import type { VehicleMediaUpload } from "../../ports/vehicleMediaStorage.js";
import {
  auditVehicleServiceEvent,
  findScopedListing,
  findScopedUnit,
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
  listingId: string;
  sizeBytes: number;
  targetId?: string;
  targetType?: VehicleDocumentTargetType;
};

export async function requestVehicleDocumentUpload(
  context: ServiceContext,
  input: RequestVehicleDocumentUploadInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleMediaUpload> {
  assertPermission(context, permission);
  await assertDocumentTarget(context, input, ports);
  const scope = requireStoreScope(context);

  logVehicleServiceEvent(context, "vehicle_document.upload.requested", {
    contentType: input.contentType,
    kind: input.kind,
    listingId: input.listingId,
    sizeBytes: input.sizeBytes,
    targetType: input.targetType ?? "vehicle_listing",
  });

  const upload = await getMediaStorage(ports).createUpload({
    contentType: input.contentType,
    fileName: input.fileName,
    scopeSegments: createVehicleObjectScope(
      scope,
      input.listingId,
      "documents",
    ),
    sizeBytes: input.sizeBytes,
  });

  await auditVehicleServiceEvent(context, {
    action: "vehicle_document.upload.request",
    category: "data_change",
    entityId: input.targetId ?? input.listingId,
    entityType: input.targetType ?? "vehicle_listing",
    metadata: {
      documentKind: input.kind,
      listingId: input.listingId,
      sizeBytes: input.sizeBytes,
      storageKey: upload.storageKey,
      targetId: input.targetId ?? input.listingId,
      targetType: input.targetType ?? "vehicle_listing",
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
  await findScopedListing(
    context,
    getListingRepository(ports),
    input.listingId,
  );

  if (input.targetType === "vehicle_unit") {
    await findScopedUnit(context, getUnitRepository(ports), {
      listingId: input.listingId,
      unitId: input.targetId ?? "",
    });
  }
}

function requireStoreScope(context: ServiceContext) {
  if (!context.storeId || !context.tenantId) {
    throw new Error("Vehicle document upload requires tenant and store scope.");
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
