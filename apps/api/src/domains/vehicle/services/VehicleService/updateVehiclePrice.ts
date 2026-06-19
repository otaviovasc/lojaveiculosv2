import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { VehicleListing } from "../../ports/vehicleInventoryRepository.js";
import {
  auditVehicleServiceEvent,
  actorUserId,
  findScopedListing,
  getListingRepository,
  getOperationsRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.update_price";

export type UpdateVehiclePriceInput = {
  listingId: string;
  priceCents: number | null;
  reason?: string | null | undefined;
};

export async function updateVehiclePrice(
  context: ServiceContext,
  input: UpdateVehiclePriceInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleListing> {
  assertPermission(context, permission);

  logVehicleServiceEvent(context, "vehicle_listing.price.update.started", {
    listingId: input.listingId,
    priceCents: input.priceCents,
  });

  const repository = getListingRepository(ports);
  const listing = await findScopedListing(context, repository, input.listingId);
  const updated = await repository.save({
    ...listing,
    priceCents: input.priceCents,
    updatedAt: new Date(),
  });
  await getOperationsRepository(ports).createPriceHistory({
    actorUserId: actorUserId(context),
    listingId: listing.id,
    newPriceCents: input.priceCents,
    oldPriceCents: listing.priceCents,
    reason: input.reason ?? null,
    storeId: context.storeId,
    tenantId: context.tenantId,
  });

  await auditVehicleServiceEvent(context, {
    action: "vehicle_listing.price.update",
    category: "data_change",
    changes: [
      {
        after: input.priceCents,
        before: listing.priceCents,
        path: "priceCents",
      },
    ],
    entityId: updated.id,
    permission,
    metadata: { reason: input.reason ?? null },
    summary: "Updated vehicle listing price",
  });

  return updated;
}
