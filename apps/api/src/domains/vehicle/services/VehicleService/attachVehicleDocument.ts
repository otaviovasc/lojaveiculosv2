import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  VehicleDocument,
  VehicleDocumentKind,
  VehicleDocumentTargetType,
  VehicleListing,
  VehicleUnit,
} from "../../ports/vehicleInventoryRepository.js";
import {
  auditVehicleServiceEvent,
  findScopedListing,
  findScopedUnitById,
  getDocumentRepository,
  getListingRepository,
  getUnitRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.document_attach";

export type AttachVehicleDocumentInput = {
  fileName: string;
  fileSizeBytes?: number | null;
  kind: VehicleDocumentKind;
  linkRole?: string;
  mimeType?: string | null;
  storageKey: string;
  title: string;
  unitId: string;
};

export async function attachVehicleDocument(
  context: ServiceContext,
  input: AttachVehicleDocumentInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleDocument> {
  assertPermission(context, permission);
  const target = await resolveDocumentTarget(context, input, ports);
  assertStorageScope(context, target.unit.id, input.storageKey);

  logVehicleServiceEvent(context, "vehicle_document.attach.started", {
    documentKind: input.kind,
    listingId: target.listing.id,
    targetId: target.targetId,
    targetType: target.targetType,
  });

  const document = await getDocumentRepository(ports).create({
    createdByUserId: context.actor.kind === "user" ? context.actor.id : null,
    fileName: input.fileName,
    fileSizeBytes: input.fileSizeBytes ?? null,
    kind: input.kind,
    linkRole: input.linkRole ?? "primary",
    metadata: createManualDocumentMetadata(context, target),
    mimeType: input.mimeType ?? null,
    status: "draft",
    storageKey: input.storageKey,
    storeId: context.storeId,
    targetId: target.targetId,
    targetType: target.targetType,
    tenantId: context.tenantId,
    title: input.title,
  });

  await auditVehicleServiceEvent(context, {
    action: "vehicle_document.attach",
    category: "data_change",
    entityId: document.id,
    entityType: "vehicle_document",
    metadata: {
      documentKind: document.kind,
      listingId: target.listing.id,
      targetId: document.targetId,
      targetType: document.targetType,
    },
    permission,
    relatedEntities: [
      { id: target.listing.id, type: "vehicle_listing" },
      { id: document.targetId, type: document.targetType },
    ],
    summary: "Attached vehicle document",
  });

  return document;
}

async function resolveDocumentTarget(
  context: ServiceContext,
  input: AttachVehicleDocumentInput,
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

  return {
    listing,
    targetId: unit.id,
    targetType: "vehicle_unit" as const,
    unit,
  };
}

function createManualDocumentMetadata(
  context: ServiceContext,
  target: {
    listing: VehicleListing;
    targetId: string;
    targetType: VehicleDocumentTargetType;
    unit: VehicleUnit;
  },
) {
  return {
    manualUpload: true,
    operationHistory: [
      {
        action: "uploaded",
        actorId: context.actor.id,
        at: new Date(),
      },
    ],
    vehicle: {
      catalog: target.listing.catalog,
      listingId: target.listing.id,
      plate: target.unit.plate ?? target.listing.plate,
      stockNumber: target.unit.stockNumber ?? null,
      title: target.listing.title,
      unitId: target.unit.id,
      vin: target.unit.vin ?? null,
    },
  };
}

function assertStorageScope(
  context: ServiceContext,
  unitId: string,
  storageKey: string,
) {
  if (!context.tenantId || !context.storeId) {
    throw new Error(
      "Vehicle document creation requires tenant and store scope.",
    );
  }

  const prefix = `tenants/${context.tenantId}/stores/${context.storeId}/units/${unitId}/`;
  if (!storageKey.startsWith(prefix)) {
    throw new VehicleDocumentStorageScopeError();
  }
}

export class VehicleDocumentStorageScopeError extends Error {
  constructor() {
    super("Vehicle document storage key is outside the scoped unit folder.");
    this.name = "VehicleDocumentStorageScopeError";
  }
}
