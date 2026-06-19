import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  VehicleDocument,
  VehicleDocumentKind,
  VehicleDocumentTargetType,
} from "../../ports/vehicleInventoryRepository.js";
import {
  auditVehicleServiceEvent,
  findScopedListing,
  findScopedUnit,
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
  listingId: string;
  mimeType?: string | null;
  storageKey: string;
  targetId?: string;
  targetType?: VehicleDocumentTargetType;
  title: string;
};

export async function attachVehicleDocument(
  context: ServiceContext,
  input: AttachVehicleDocumentInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleDocument> {
  assertPermission(context, permission);
  const target = await resolveDocumentTarget(context, input, ports);
  assertStorageScope(context, input.listingId, input.storageKey);

  logVehicleServiceEvent(context, "vehicle_document.attach.started", {
    documentKind: input.kind,
    listingId: input.listingId,
    targetId: target.targetId,
    targetType: target.targetType,
  });

  const document = await getDocumentRepository(ports).create({
    createdByUserId: context.actor.kind === "user" ? context.actor.id : null,
    fileName: input.fileName,
    fileSizeBytes: input.fileSizeBytes ?? null,
    kind: input.kind,
    linkRole: input.linkRole ?? "primary",
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
      listingId: input.listingId,
      targetId: document.targetId,
      targetType: document.targetType,
    },
    permission,
    relatedEntities: [
      { id: input.listingId, type: "vehicle_listing" },
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
  const listing = await findScopedListing(
    context,
    getListingRepository(ports),
    input.listingId,
  );

  if (input.targetType === "vehicle_unit") {
    const unit = await findScopedUnit(context, getUnitRepository(ports), {
      listingId: listing.id,
      unitId: input.targetId ?? "",
    });
    return { targetId: unit.id, targetType: "vehicle_unit" as const };
  }

  return { targetId: listing.id, targetType: "vehicle_listing" as const };
}

function assertStorageScope(
  context: ServiceContext,
  listingId: string,
  storageKey: string,
) {
  if (!context.tenantId || !context.storeId) {
    throw new Error(
      "Vehicle document creation requires tenant and store scope.",
    );
  }

  const prefix = `tenants/${context.tenantId}/stores/${context.storeId}/listings/${listingId}/`;
  if (!storageKey.startsWith(prefix)) {
    throw new VehicleDocumentStorageScopeError();
  }
}

export class VehicleDocumentStorageScopeError extends Error {
  constructor() {
    super("Vehicle document storage key is outside the scoped listing folder.");
    this.name = "VehicleDocumentStorageScopeError";
  }
}
