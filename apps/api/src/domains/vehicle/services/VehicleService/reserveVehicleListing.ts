import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { assertStoreUserActor } from "../../authorization/storeWorkflowActor.js";
import { createReservationFinanceEntry } from "../../finance/vehicleFinanceEntries.js";
import { buildReservationReceiptDocument } from "../../documents/vehicleWorkflowDocuments.js";
import { storeWorkflowDocument } from "../../documents/storeWorkflowDocument.js";
import type { VehicleBuyerSnapshot } from "../../ports/vehicleSalesRepository.js";
import {
  actorUserId,
  auditVehicleServiceEvent,
  findScopedListing,
  findScopedUnit,
  getDocumentRepository,
  getFinanceRepository,
  getListingRepository,
  getMediaStorage,
  getOperationsRepository,
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
  const financeEntry = await createReservationFinanceEntry({
    financeRepository: getFinanceRepository(ports),
    listing,
    paymentMethod: input.paymentMethod,
    sale,
    sellerUserId: actorUserId(context),
    signalAmountCents: input.signalAmountCents,
    unit,
  });
  const reservedListing = {
    ...listing,
    status: "reserved",
    updatedAt: new Date(),
  } as const;

  const document = buildReservationReceiptDocument({
    buyer: input.buyer,
    listing: reservedListing,
    paymentMethod: input.paymentMethod,
    sale,
    signalAmountCents: input.signalAmountCents,
    unit,
  });
  const storedDocument = await storeWorkflowDocument(
    {
      ...document,
      createdByUserId: actorUserId(context),
    },
    getMediaStorage(ports),
  );
  const createdDocument =
    await getDocumentRepository(ports).create(storedDocument);
  const updatedListing = await listingRepository.save(reservedListing);
  await unitRepository.save({
    ...unit,
    status: "reserved",
    updatedAt: new Date(),
  });
  await getOperationsRepository(ports).createStatusHistory({
    actorUserId: actorUserId(context),
    fromStatus: listing.status,
    listingId: listing.id,
    reason: input.reason ?? "Reservation workflow",
    storeId: context.storeId,
    target: "listing",
    tenantId: context.tenantId,
    toStatus: "reserved",
    unitId: null,
  });

  await auditVehicleServiceEvent(context, {
    action: "vehicle_listing.reserve",
    category: "data_change",
    changes: [{ after: "reserved", before: listing.status, path: "status" }],
    entityId: listing.id,
    metadata: {
      saleId: sale.sale.id,
      salePaymentId: sale.payment?.id ?? null,
      documentId: createdDocument.id,
      documentStorageKey: createdDocument.storageKey,
      financeEntryId: financeEntry.entry.id,
      signalAmountCents: input.signalAmountCents,
    },
    permission,
    relatedEntities: [
      { id: sale.sale.id, type: "vehicle_sale" },
      { id: financeEntry.entry.id, type: "finance_entry" },
    ],
    summary: "Reserved vehicle listing and emitted signal receipt",
  });

  return updatedListing;
}

export class VehicleWorkflowValidationError extends Error {
  constructor(fieldName: string) {
    super(`Vehicle workflow requires ${fieldName}`);
    this.name = "VehicleWorkflowValidationError";
  }
}
