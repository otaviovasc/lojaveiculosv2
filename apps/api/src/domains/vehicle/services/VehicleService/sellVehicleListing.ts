import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { assertStoreUserActor } from "../../authorization/storeWorkflowActor.js";
import type { VehicleBuyerSnapshot } from "../../ports/vehicleSalesRepository.js";
import { completeSaleWorkflow } from "../../workflows/vehicleSaleWorkflow.js";
import {
  assertSellableVehicleState,
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

const permission = "inventory.sell";

export type SellVehicleListingInput = {
  buyer: VehicleBuyerSnapshot;
  listingId?: string | undefined;
  paidAmountCents?: number | null | undefined;
  paymentMethod: string;
  reason?: string | null | undefined;
  salePriceCents?: number | null | undefined;
  unitId: string;
};

export async function sellVehicleListing(
  context: ServiceContext,
  input: SellVehicleListingInput,
  ports?: VehicleInventoryServicePorts,
) {
  assertPermission(context, permission);
  assertStoreUserActor(context);
  logVehicleServiceEvent(context, "vehicle_unit.sell.started", {
    listingId: input.listingId ?? null,
    unitId: input.unitId,
  });

  const listingRepository = getListingRepository(ports);
  const unitRepository = getUnitRepository(ports);
  const unit = await findScopedUnitById(context, unitRepository, input.unitId);
  if (input.listingId && unit.listingId !== input.listingId) {
    throw new VehicleWorkflowValidationError("matching listingId");
  }
  const listing = await findScopedListing(
    context,
    listingRepository,
    unit.listingId,
  );
  assertSellableVehicleState(listing, unit);
  const salePriceCents = input.salePriceCents ?? listing.priceCents;
  if (!salePriceCents)
    throw new VehicleWorkflowValidationError("salePriceCents");

  const paidAmountCents = input.paidAmountCents ?? salePriceCents;
  const sale = await getSalesRepository(ports).create({
    buyerSnapshot: input.buyer,
    listing,
    payment: {
      amountCents: paidAmountCents,
      method: input.paymentMethod,
      paidAt: new Date(),
      status: "paid",
    },
    salePriceCents,
    sellerUserId: actorUserId(context),
    status: "closed",
    unit,
  });
  const workflow = await completeSaleWorkflow(context, {
    buyer: input.buyer,
    listing,
    paymentMethod: input.paymentMethod,
    ports,
    reason: input.reason,
    sale,
    unit,
  });

  await auditVehicleServiceEvent(context, {
    action: "vehicle_unit.sell",
    category: "data_change",
    changes: [{ after: "sold", before: unit.status, path: "unit.status" }],
    entityId: unit.id,
    entityType: "vehicle_unit",
    metadata: {
      documentCount: workflow.documents.length,
      documentIds: workflow.documents.map((document) => document.id),
      financeEntryId: workflow.financeEntry.entry.id,
      listingId: listing.id,
      saleId: sale.sale.id,
      salePaymentId: sale.payment?.id ?? null,
      salePriceCents,
    },
    permission,
    relatedEntities: [
      { id: listing.id, type: "vehicle_listing" },
      { id: sale.sale.id, type: "vehicle_sale" },
      { id: workflow.financeEntry.entry.id, type: "finance_entry" },
    ],
    summary: "Sold vehicle unit and emitted sale document bundle",
  });

  return workflow.updatedListing;
}
