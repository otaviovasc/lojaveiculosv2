import type { ServiceContext } from "../../../shared/serviceContext.js";
import type {
  VehicleListing,
  VehicleListingStatus,
} from "../ports/vehicleInventoryRepository.js";
import {
  actorUserId,
  getOperationsRepository,
  type VehicleInventoryServicePorts,
} from "../services/VehicleService/serviceSupport.js";

export type ListingOperationsLedgerInput = {
  priceCents?: number | null;
  status?: VehicleListingStatus;
};

export async function recordListingOperationsLedger(
  context: ServiceContext,
  before: VehicleListing,
  after: VehicleListing,
  input: ListingOperationsLedgerInput,
  ports?: VehicleInventoryServicePorts,
) {
  if (
    input.priceCents !== undefined &&
    before.priceCents !== after.priceCents
  ) {
    await getOperationsRepository(ports).createPriceHistory({
      actorUserId: actorUserId(context),
      listingId: before.id,
      newPriceCents: after.priceCents,
      oldPriceCents: before.priceCents,
      reason: null,
      storeId: context.storeId,
      tenantId: context.tenantId,
    });
  }

  if (input.status !== undefined && before.status !== after.status) {
    await getOperationsRepository(ports).createStatusHistory({
      actorUserId: actorUserId(context),
      fromStatus: before.status,
      listingId: before.id,
      reason: null,
      storeId: context.storeId,
      target: "listing",
      tenantId: context.tenantId,
      toStatus: after.status,
      unitId: null,
    });
  }
}
