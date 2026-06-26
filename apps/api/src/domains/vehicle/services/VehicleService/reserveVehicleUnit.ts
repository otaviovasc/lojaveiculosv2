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
  findScopedUnitById,
  getListingRepository,
  getSalesRepository,
  getUnitRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.reserve";

export type ReserveVehicleUnitInput = {
  buyer: VehicleBuyerSnapshot;
  paymentMethod: string;
  reason?: string | null | undefined;
  salePriceCents?: number | null | undefined;
  signalAmountCents: number;
  unitId: string;
};

export async function reserveVehicleUnit(
  context: ServiceContext,
  input: ReserveVehicleUnitInput,
  ports?: VehicleInventoryServicePorts,
) {
  assertPermission(context, permission);
  assertStoreUserActor(context);
  logVehicleServiceEvent(context, "vehicle_unit.reserve.started", {
    unitId: input.unitId,
  });

  const listingRepository = getListingRepository(ports);
  const unitRepository = getUnitRepository(ports);
  const unit = await findScopedUnitById(context, unitRepository, input.unitId);
  const listing = await findScopedListing(
    context,
    listingRepository,
    unit.listingId,
  );
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
    action: "vehicle_unit.reserve",
    category: "data_change",
    changes: [{ after: "reserved", before: unit.status, path: "unit.status" }],
    entityId: unit.id,
    entityType: "vehicle_unit",
    metadata: {
      listingId: listing.id,
      saleId: sale.sale.id,
      salePaymentId: sale.payment?.id ?? null,
      documentId: createdDocument?.id ?? null,
      documentStorageKey: createdDocument?.storageKey ?? null,
      financeEntryId: workflow.financeEntry.entry.id,
      signalAmountCents: input.signalAmountCents,
    },
    permission,
    relatedEntities: [
      { id: listing.id, type: "vehicle_listing" },
      { id: sale.sale.id, type: "vehicle_sale" },
      { id: workflow.financeEntry.entry.id, type: "finance_entry" },
    ],
    summary: "Reserved vehicle unit and emitted signal receipt",
  });

  return workflow.updatedListing;
}
