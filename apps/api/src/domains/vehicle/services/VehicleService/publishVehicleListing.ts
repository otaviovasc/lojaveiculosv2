import type { AuditFieldChange } from "@lojaveiculosv2/audit";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { VehicleListing } from "../../ports/vehicleInventoryRepository.js";
import { VehiclePublicationValidationError } from "../../publication/publicationErrors.js";
import { resolvePublicationSlug } from "../../publication/publicationSlug.js";
import {
  actorUserId,
  auditVehicleServiceEvent,
  findScopedListing,
  getListingRepository,
  getOperationsRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.update_status";

export { VehiclePublicationValidationError } from "../../publication/publicationErrors.js";

export type PublishVehicleListingInput = {
  listingId: string;
  publicSlug?: string | null | undefined;
  reason?: string | null | undefined;
};

export type UnpublishVehicleListingInput = {
  listingId: string;
  reason?: string | null | undefined;
};

export async function publishVehicleListing(
  context: ServiceContext,
  input: PublishVehicleListingInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleListing> {
  assertPermission(context, permission);

  const repository = getListingRepository(ports);
  const listing = await findScopedListing(context, repository, input.listingId);
  assertListingCanChangePublication(listing, "publish");

  const publicSlug = await resolvePublicationSlug(
    context,
    repository,
    listing,
    input.publicSlug,
  );
  logVehicleServiceEvent(
    context,
    "vehicle_listing.publication.publish.started",
    {
      listingId: listing.id,
      publicSlug,
    },
  );

  const updated = await repository.save({
    ...listing,
    isVisibleOnPublicSite: true,
    publicSlug,
    status: "published",
    updatedAt: new Date(),
  });

  await recordPublicationStatusHistory(
    context,
    listing,
    updated,
    input.reason,
    ports,
  );
  await auditVehicleServiceEvent(context, {
    action: "vehicle_listing.publication.publish",
    category: "data_change",
    changes: publicationChanges(listing, updated),
    entityId: updated.id,
    metadata: {
      publicSlug,
      reason: input.reason ?? null,
    },
    permission,
    summary: "Published vehicle listing to public storefront",
  });

  return updated;
}

export async function unpublishVehicleListing(
  context: ServiceContext,
  input: UnpublishVehicleListingInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleListing> {
  assertPermission(context, permission);

  const repository = getListingRepository(ports);
  const listing = await findScopedListing(context, repository, input.listingId);
  assertListingCanChangePublication(listing, "unpublish");

  logVehicleServiceEvent(
    context,
    "vehicle_listing.publication.unpublish.started",
    {
      listingId: listing.id,
      publicSlug: listing.publicSlug,
    },
  );

  const updated = await repository.save({
    ...listing,
    isVisibleOnPublicSite: false,
    status: "unpublished",
    updatedAt: new Date(),
  });

  await recordPublicationStatusHistory(
    context,
    listing,
    updated,
    input.reason,
    ports,
  );
  await auditVehicleServiceEvent(context, {
    action: "vehicle_listing.publication.unpublish",
    category: "data_change",
    changes: publicationChanges(listing, updated),
    entityId: updated.id,
    metadata: {
      publicSlug: updated.publicSlug,
      reason: input.reason ?? null,
    },
    permission,
    summary: "Unpublished vehicle listing from public storefront",
  });

  return updated;
}

function assertListingCanChangePublication(
  listing: VehicleListing,
  action: "publish" | "unpublish",
) {
  if (listing.status === "archived" || listing.status === "sold_out") {
    throw new VehiclePublicationValidationError(
      `Vehicle listing ${listing.status} cannot be ${action}ed.`,
    );
  }
}

async function recordPublicationStatusHistory(
  context: ServiceContext,
  before: VehicleListing,
  after: VehicleListing,
  reason: string | null | undefined,
  ports: VehicleInventoryServicePorts | undefined,
) {
  await getOperationsRepository(ports).createStatusHistory({
    actorUserId: actorUserId(context),
    fromStatus: before.status,
    listingId: before.id,
    reason: reason ?? null,
    storeId: context.storeId,
    target: "listing",
    tenantId: context.tenantId,
    toStatus: after.status,
    unitId: null,
  });
}

function publicationChanges(
  before: VehicleListing,
  after: VehicleListing,
): AuditFieldChange[] {
  return [
    changeFor("status", before.status, after.status),
    changeFor(
      "isVisibleOnPublicSite",
      before.isVisibleOnPublicSite,
      after.isVisibleOnPublicSite,
    ),
    changeFor("publicSlug", before.publicSlug, after.publicSlug),
  ].filter((change): change is AuditFieldChange => Boolean(change));
}

function changeFor(
  path: string,
  before: boolean | string | null,
  after: boolean | string | null,
): AuditFieldChange | null {
  if (before === after) return null;
  return { after, before, path };
}
