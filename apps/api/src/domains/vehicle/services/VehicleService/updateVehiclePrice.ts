import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { VehicleListing } from "../../ports/vehicleInventoryRepository.js";
import {
  auditVehicleServiceEvent,
  findScopedListing,
  getListingRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.update_price";

export type UpdateVehiclePriceInput = {
  listingId: string;
  priceCents: number | null;
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
    summary: "Updated vehicle listing price",
  });

  return updated;
}
