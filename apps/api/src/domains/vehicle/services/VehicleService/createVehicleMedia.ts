import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  VehicleMedia,
  VehicleMediaKind,
} from "../../ports/vehicleInventoryRepository.js";
import {
  auditVehicleServiceEvent,
  findScopedListing,
  findScopedUnitById,
  getListingRepository,
  getMediaRepository,
  getMediaStorage,
  getUnitRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.create";

export type CreateVehicleMediaInput = {
  altText?: string | null;
  displayOrder?: number;
  kind: VehicleMediaKind;
  storageKey: string;
  unitId: string;
};

export async function createVehicleMedia(
  context: ServiceContext,
  input: CreateVehicleMediaInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleMedia> {
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
  const expectedPrefix = createStoragePrefix(context, unit.id);

  if (!input.storageKey.startsWith(expectedPrefix)) {
    throw new VehicleMediaStorageScopeError();
  }

  logVehicleServiceEvent(context, "vehicle_media.create.started", {
    kind: input.kind,
    listingId: listing.id,
    storageKey: input.storageKey,
    unitId: unit.id,
  });

  const media = await getMediaRepository(ports).create({
    altText: input.altText ?? null,
    displayOrder: input.displayOrder ?? 0,
    isPublic: true,
    kind: input.kind,
    storageKey: input.storageKey,
    storeId: context.storeId,
    tenantId: context.tenantId,
    unitId: unit.id,
    url: getMediaStorage(ports).getPublicUrl(input.storageKey),
  });

  await auditVehicleServiceEvent(context, {
    action: "vehicle_media.create",
    category: "data_change",
    entityId: media.id,
    entityType: "vehicle_media",
    metadata: {
      kind: media.kind,
      listingId: listing.id,
      storageKey: media.storageKey,
      unitId: unit.id,
    },
    permission,
    relatedEntities: [
      { id: unit.id, type: "vehicle_unit" },
      { id: listing.id, type: "vehicle_listing" },
    ],
    summary: "Attached vehicle media to unit",
  });

  return media;
}

export class VehicleMediaStorageScopeError extends Error {
  constructor() {
    super("Vehicle media storage key is outside the scoped unit folder.");
    this.name = "VehicleMediaStorageScopeError";
  }
}

function createStoragePrefix(context: ServiceContext, unitId: string) {
  if (!context.tenantId || !context.storeId) {
    throw new Error("Vehicle media creation requires tenant and store scope.");
  }

  return `tenants/${context.tenantId}/stores/${context.storeId}/units/${unitId}/`;
}
