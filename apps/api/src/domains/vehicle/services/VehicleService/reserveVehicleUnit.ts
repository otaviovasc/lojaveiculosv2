import type { SalePaymentMethod } from "@lojaveiculosv2/shared";
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
  paymentMethod: SalePaymentMethod;
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
  if (!salePriceCents || salePriceCents <= 0)
    throw new VehicleWorkflowValidationError("salePriceCents");
  if (
    input.signalAmountCents <= 0 ||
    input.signalAmountCents > salePriceCents
  ) {
    throw new VehicleWorkflowValidationError("signalAmountCents");
  }

  const sale = await getSalesRepository(ports).create({
    buyerSnapshot: input.buyer,
    listing,
    payments: [
      {
        amountCents: input.signalAmountCents,
        dueAt: null,
        extraCents: 0,
        installments: null,
        metadata: {},
        method: input.paymentMethod,
        paidAt: null,
        principalCents: input.signalAmountCents,
        providerPaymentId: null,
        status: "pending",
      },
    ],
    salePriceCents,
    sellerUserId: actorUserId(context),
    status: "pending",
    unit,
  });
  const [signalPayment] = sale.payments;
  if (!signalPayment) {
    throw new VehicleWorkflowValidationError("reservation sale payment");
  }
  const workflow = await completeReservationWorkflow(context, {
    buyer: input.buyer,
    listing,
    ports,
    reason: input.reason,
    sale,
    signalPayment,
    unit,
  });
  const [createdDocument] = workflow.documents;
  const [financeEntry] = workflow.financeEntries;
  if (!financeEntry) {
    throw new VehicleWorkflowValidationError("reservation finance entry");
  }

  await auditVehicleServiceEvent(context, {
    action: "vehicle_unit.reserve",
    category: "data_change",
    changes: [{ after: "reserved", before: unit.status, path: "unit.status" }],
    entityId: unit.id,
    entityType: "vehicle_unit",
    metadata: {
      listingId: listing.id,
      saleId: sale.sale.id,
      salePaymentId: signalPayment.id,
      documentId: createdDocument?.id ?? null,
      documentStorageKey: createdDocument?.storageKey ?? null,
      financeEntryId: financeEntry.entry.id,
      signalAmountCents: input.signalAmountCents,
    },
    permission,
    relatedEntities: [
      { id: listing.id, type: "vehicle_listing" },
      { id: sale.sale.id, type: "vehicle_sale" },
      { id: financeEntry.entry.id, type: "finance_entry" },
    ],
    summary: "Reserved vehicle unit and emitted signal receipt",
  });

  return workflow.updatedListing;
}
