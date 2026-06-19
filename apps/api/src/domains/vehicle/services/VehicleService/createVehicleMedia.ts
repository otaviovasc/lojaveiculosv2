import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  VehicleMedia,
  VehicleMediaKind,
} from "../../ports/vehicleInventoryRepository.js";
import {
  auditVehicleServiceEvent,
  findScopedListing,
  getListingRepository,
  getMediaRepository,
  getMediaStorage,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.create";

export type CreateVehicleMediaInput = {
  altText?: string | null;
  displayOrder?: number;
  kind: VehicleMediaKind;
  listingId: string;
  storageKey: string;
};

export async function createVehicleMedia(
  context: ServiceContext,
  input: CreateVehicleMediaInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleMedia> {
  assertPermission(context, permission);
  const listing = await findScopedListing(
    context,
    getListingRepository(ports),
    input.listingId,
  );
  const expectedPrefix = createStoragePrefix(context, listing.id);

  if (!input.storageKey.startsWith(expectedPrefix)) {
    throw new VehicleMediaStorageScopeError();
  }

  logVehicleServiceEvent(context, "vehicle_media.create.started", {
    kind: input.kind,
    listingId: listing.id,
    storageKey: input.storageKey,
  });

  const media = await getMediaRepository(ports).create({
    altText: input.altText ?? null,
    displayOrder: input.displayOrder ?? 0,
    isPublic: true,
    kind: input.kind,
    listingId: listing.id,
    storageKey: input.storageKey,
    storeId: context.storeId,
    tenantId: context.tenantId,
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
    },
    permission,
    relatedEntities: [{ id: listing.id, type: "vehicle_listing" }],
    summary: "Attached vehicle media to listing",
  });

  return media;
}

export class VehicleMediaStorageScopeError extends Error {
  constructor() {
    super("Vehicle media storage key is outside the scoped listing folder.");
    this.name = "VehicleMediaStorageScopeError";
  }
}

function createStoragePrefix(context: ServiceContext, listingId: string) {
  if (!context.tenantId || !context.storeId) {
    throw new Error("Vehicle media creation requires tenant and store scope.");
  }

  return `tenants/${context.tenantId}/stores/${context.storeId}/listings/${listingId}/`;
}
