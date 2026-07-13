import type { SalePaymentMethod } from "@lojaveiculosv2/shared";
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

export type SellVehicleUnitInput = {
  buyer: VehicleBuyerSnapshot;
  paidAmountCents?: number | null | undefined;
  paymentMethod: SalePaymentMethod;
  reason?: string | null | undefined;
  salePriceCents?: number | null | undefined;
  unitId: string;
};

export async function sellVehicleUnit(
  context: ServiceContext,
  input: SellVehicleUnitInput,
  ports?: VehicleInventoryServicePorts,
) {
  assertPermission(context, permission);
  assertStoreUserActor(context);
  logVehicleServiceEvent(context, "vehicle_unit.sell.started", {
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
  assertSellableVehicleState(listing, unit);
  const salePriceCents = input.salePriceCents ?? listing.priceCents;
  if (!salePriceCents || salePriceCents <= 0)
    throw new VehicleWorkflowValidationError("salePriceCents");

  const paidAmountCents = input.paidAmountCents ?? salePriceCents;
  if (paidAmountCents < salePriceCents) {
    throw new VehicleWorkflowValidationError("payment principal coverage");
  }
  const extraCents = paidAmountCents - salePriceCents;
  const paidAt = new Date();
  const sale = await getSalesRepository(ports).create({
    buyerSnapshot: input.buyer,
    listing,
    payments: [
      {
        amountCents: paidAmountCents,
        dueAt: paidAt,
        extraCents,
        installments: null,
        metadata: {},
        method: input.paymentMethod,
        paidAt,
        principalCents: salePriceCents,
        providerPaymentId: null,
        status: "paid",
      },
    ],
    salePriceCents,
    sellerUserId: actorUserId(context),
    status: "closed",
    unit,
  });
  const workflow = await completeSaleWorkflow(context, {
    buyer: input.buyer,
    listing,
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
      financeEntryIds: workflow.financeEntries.map((bundle) => bundle.entry.id),
      listingId: listing.id,
      saleId: sale.sale.id,
      salePaymentIds: sale.payments.map((payment) => payment.id),
      salePriceCents,
    },
    permission,
    relatedEntities: [
      { id: listing.id, type: "vehicle_listing" },
      { id: sale.sale.id, type: "vehicle_sale" },
      ...workflow.financeEntries.map((bundle) => ({
        id: bundle.entry.id,
        type: "finance_entry" as const,
      })),
    ],
    summary: "Sold vehicle unit and emitted sale document bundle",
  });

  return workflow.updatedListing;
}
