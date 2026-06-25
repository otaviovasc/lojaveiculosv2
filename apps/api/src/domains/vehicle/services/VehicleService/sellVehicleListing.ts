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
  findScopedUnit,
  getListingRepository,
  getSalesRepository,
  getUnitRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.sell";

export type SellVehicleListingInput = {
  buyer: VehicleBuyerSnapshot;
  listingId: string;
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
  logVehicleServiceEvent(context, "vehicle_listing.sell.started", {
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
    action: "vehicle_listing.sell",
    category: "data_change",
    changes: [{ after: "sold", before: listing.status, path: "status" }],
    entityId: listing.id,
    metadata: {
      documentCount: workflow.documents.length,
      documentIds: workflow.documents.map((document) => document.id),
      financeEntryId: workflow.financeEntry.entry.id,
      saleId: sale.sale.id,
      salePaymentId: sale.payment?.id ?? null,
      salePriceCents,
    },
    permission,
    relatedEntities: [
      { id: sale.sale.id, type: "vehicle_sale" },
      { id: workflow.financeEntry.entry.id, type: "finance_entry" },
    ],
    summary: "Sold vehicle listing and emitted sale document bundle",
  });

  return workflow.updatedListing;
}
