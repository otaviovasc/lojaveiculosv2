import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { assertStoreUserActor } from "../../authorization/storeWorkflowActor.js";
import type { VehicleBuyerSnapshot } from "../../ports/vehicleSalesRepository.js";
import { completeReservationWorkflow } from "../../workflows/vehicleSaleWorkflow.js";
import {
  assertReservableVehicleState,
  VehicleWorkflowValidationError,
} from "../../workflows/vehicleSaleWorkflowRules.js";
import {
  actorUserId,
  auditVehicleServiceEvent,
  findScopedListing,
  findScopedUnit,
  getListingRepository,
  getSalesRepository,
  getUnitRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.reserve";

export type ReserveVehicleListingInput = {
  buyer: VehicleBuyerSnapshot;
  listingId: string;
  paymentMethod: string;
  reason?: string | null | undefined;
  salePriceCents?: number | null | undefined;
  signalAmountCents: number;
  unitId: string;
};

export async function reserveVehicleListing(
  context: ServiceContext,
  input: ReserveVehicleListingInput,
  ports?: VehicleInventoryServicePorts,
) {
  assertPermission(context, permission);
  assertStoreUserActor(context);
  logVehicleServiceEvent(context, "vehicle_listing.reserve.started", {
    listingId: input.listingId,
    unitId: input.unitId,
  });

  const listingRepository = getListingRepository(ports);
  const unitRepository = getUnitRepository(ports);
  const listing = await findScopedListing(
    context,
    listingRepository,
    input.listingId,
  );
  const unit = await findScopedUnit(context, unitRepository, input);
  assertReservableVehicleState(listing, unit);
  const salePriceCents = input.salePriceCents ?? listing.priceCents;
  if (!salePriceCents)
    throw new VehicleWorkflowValidationError("salePriceCents");

  const sale = await getSalesRepository(ports).create({
    buyerSnapshot: input.buyer,
    listing,
    payment: {
      amountCents: input.signalAmountCents,
      method: input.paymentMethod,
      paidAt: null,
      status: "pending",
    },
    salePriceCents,
    sellerUserId: actorUserId(context),
    status: "pending",
    unit,
  });
  const workflow = await completeReservationWorkflow(context, {
    buyer: input.buyer,
    listing,
    paymentMethod: input.paymentMethod,
    ports,
    reason: input.reason,
    sale,
    signalAmountCents: input.signalAmountCents,
    unit,
  });
  const [createdDocument] = workflow.documents;

  await auditVehicleServiceEvent(context, {
    action: "vehicle_listing.reserve",
    category: "data_change",
    changes: [{ after: "reserved", before: listing.status, path: "status" }],
    entityId: listing.id,
    metadata: {
      saleId: sale.sale.id,
      salePaymentId: sale.payment?.id ?? null,
      documentId: createdDocument?.id ?? null,
      documentStorageKey: createdDocument?.storageKey ?? null,
      financeEntryId: workflow.financeEntry.entry.id,
      signalAmountCents: input.signalAmountCents,
    },
    permission,
    relatedEntities: [
      { id: sale.sale.id, type: "vehicle_sale" },
      { id: workflow.financeEntry.entry.id, type: "finance_entry" },
    ],
    summary: "Reserved vehicle listing and emitted signal receipt",
  });

  return workflow.updatedListing;
}
