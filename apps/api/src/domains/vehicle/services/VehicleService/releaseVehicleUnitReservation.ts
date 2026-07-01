import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { assertStoreUserActor } from "../../authorization/storeWorkflowActor.js";
import type { VehicleSaleBundle } from "../../ports/vehicleSalesRepository.js";
import type {
  VehicleListing,
  VehicleUnit,
} from "../../ports/vehicleInventoryRepository.js";
import {
  VehicleWorkflowStateError,
  VehicleWorkflowValidationError,
} from "../../workflows/vehicleSaleWorkflowRules.js";
import {
  assertPendingReservationSale,
  assertPendingSignal,
  assertReservedUnit,
  findReservationFinanceEntry,
} from "../../workflows/releaseVehicleReservationSupport.js";
import {
  actorUserId,
  auditVehicleServiceEvent,
  findScopedListing,
  findScopedUnitById,
  getFinanceRepository,
  getListingRepository,
  getOperationsRepository,
  getSalesRepository,
  getUnitRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.reserve";

export type ReleaseVehicleReservationOutcome = "cancel" | "expire" | "release";

export type ReleaseVehicleUnitReservationInput = {
  outcome?: ReleaseVehicleReservationOutcome | undefined;
  pendingSale?: VehicleSaleBundle | undefined;
  reason?: string | null | undefined;
  saleId?: string | null | undefined;
  unitId: string;
};

export async function releaseVehicleUnitReservation(
  context: ServiceContext,
  input: ReleaseVehicleUnitReservationInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleListing> {
  assertPermission(context, permission);
  assertStoreUserActor(context);

  const unit = await findScopedUnitById(
    context,
    getUnitRepository(ports),
    input.unitId,
  );
  assertReservedUnit(unit);
  const listing = await findScopedListing(
    context,
    getListingRepository(ports),
    unit.listingId,
  );
  const sale =
    input.pendingSale ??
    (await getSalesRepository(ports).findPendingByUnit({
      storeId: context.storeId,
      tenantId: context.tenantId,
      unitId: unit.id,
    }));
  if (!sale)
    throw new VehicleWorkflowStateError("Pending reservation sale not found.");
  assertPendingReservationSale(context, sale, unit);
  if (input.saleId && sale.sale.id !== input.saleId) {
    throw new VehicleWorkflowStateError("Pending reservation sale mismatch.");
  }
  if (!sale.payment) {
    throw new VehicleWorkflowValidationError("reservation sale payment");
  }

  const financeEntry = await findReservationFinanceEntry(
    getFinanceRepository(ports),
    context,
    sale.payment.id,
  );
  assertPendingSignal(sale.payment.status, financeEntry);

  const outcome = input.outcome ?? "release";
  const outcomeConfig = reservationOutcomeConfig[outcome];
  const reason = input.reason ?? outcomeConfig.defaultReason;
  logVehicleServiceEvent(context, outcomeConfig.startedEvent, {
    financeEntryId: financeEntry.entry.id,
    listingId: listing.id,
    outcome,
    saleId: sale.sale.id,
    unitId: unit.id,
  });

  await getFinanceRepository(ports).updateEntry({
    entryId: financeEntry.entry.id,
    metadata: {
      ...financeEntry.entry.metadata,
      cancelledReason: reason,
      reservationOutcome: outcome,
      source: financeEntry.entry.metadata.source ?? "vehicle_reservation",
    },
    status: "cancelled",
    storeId: context.storeId,
    tenantId: context.tenantId,
  });
  if (!input.pendingSale) {
    await getSalesRepository(ports).cancelPending({
      reason,
      saleId: sale.sale.id,
      storeId: context.storeId,
      tenantId: context.tenantId,
    });
  }
  await getUnitRepository(ports).save({
    ...unit,
    status: "available",
    updatedAt: new Date(),
  });
  await getOperationsRepository(ports).createStatusHistory({
    actorUserId: actorUserId(context),
    fromStatus: unit.status,
    listingId: listing.id,
    reason,
    storeId: context.storeId,
    target: "unit",
    tenantId: context.tenantId,
    toStatus: "available",
    unitId: unit.id,
  });
  const updatedListing = await restoreListingIfUnitAvailable(
    context,
    listing,
    unit,
    reason,
    ports,
  );

  await auditVehicleServiceEvent(context, {
    action: outcomeConfig.auditAction,
    category: "data_change",
    changes: [
      { after: "available", before: unit.status, path: "unit.status" },
      {
        after: "cancelled",
        before: financeEntry.entry.status,
        path: "reservation_signal.status",
      },
      { after: "cancelled", before: sale.sale.status, path: "sale.status" },
    ],
    entityId: unit.id,
    entityType: "vehicle_unit",
    metadata: {
      financeEntryId: financeEntry.entry.id,
      listingId: listing.id,
      outcome,
      reason,
      saleId: sale.sale.id,
      salePaymentId: sale.payment.id,
    },
    permission,
    relatedEntities: [
      { id: listing.id, type: "vehicle_listing" },
      { id: sale.sale.id, type: "vehicle_sale" },
      { id: financeEntry.entry.id, type: "finance_entry" },
    ],
    summary: outcomeConfig.auditSummary,
  });

  return updatedListing;
}

const reservationOutcomeConfig: Record<
  ReleaseVehicleReservationOutcome,
  {
    auditAction: string;
    auditSummary: string;
    defaultReason: string;
    startedEvent: string;
  }
> = {
  cancel: {
    auditAction: "vehicle_unit.reservation.cancel",
    auditSummary: "Cancelled vehicle unit reservation",
    defaultReason: "Reservation cancelled",
    startedEvent: "vehicle_unit.reservation.cancel.started",
  },
  expire: {
    auditAction: "vehicle_unit.reservation.expire",
    auditSummary: "Expired vehicle unit reservation",
    defaultReason: "Reservation expired",
    startedEvent: "vehicle_unit.reservation.expire.started",
  },
  release: {
    auditAction: "vehicle_unit.reservation.release",
    auditSummary: "Released vehicle unit reservation",
    defaultReason: "Reservation released",
    startedEvent: "vehicle_unit.reservation.release.started",
  },
};

async function restoreListingIfUnitAvailable(
  context: ServiceContext,
  listing: VehicleListing,
  unit: VehicleUnit,
  reason: string,
  ports: VehicleInventoryServicePorts | undefined,
): Promise<VehicleListing> {
  if (listing.status !== "sold_out") return listing;
  const updatedListing = await getListingRepository(ports).save({
    ...listing,
    status: "published",
    updatedAt: new Date(),
  });
  await getOperationsRepository(ports).createStatusHistory({
    actorUserId: actorUserId(context),
    fromStatus: listing.status,
    listingId: listing.id,
    reason,
    storeId: context.storeId,
    target: "listing",
    tenantId: context.tenantId,
    toStatus: "published",
    unitId: unit.id,
  });
  return updatedListing;
}
