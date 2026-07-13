import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { FinanceEntryBundle } from "../../finance/ports/financeRepository.js";
import type { VehicleDocument } from "../ports/vehicleInventoryRepository.js";
import type {
  VehicleBuyerSnapshot,
  VehicleSaleBundle,
  VehicleSalePayment,
} from "../ports/vehicleSalesRepository.js";
import type {
  VehicleListing,
  VehicleUnit,
} from "../ports/vehicleInventoryRepository.js";
import {
  buildReservationReceiptDocument,
  buildSoldDocuments,
  type VehicleSaleDocumentKind,
} from "../documents/vehicleWorkflowDocuments.js";
import { storeWorkflowDocument } from "../documents/storeWorkflowDocument.js";
import {
  getReservationWorkflowTemplate,
  getSaleWorkflowTemplates,
} from "../documents/vehicleWorkflowTemplates.js";
import { getVehicleWorkflowStoreBranding } from "../documents/vehicleWorkflowStoreBranding.js";
import {
  createReservationFinanceEntry,
  createSaleFinanceEntries,
} from "../finance/vehicleFinanceEntries.js";
import {
  actorUserId,
  getDocumentRepository,
  getFinanceRepository,
  getListingRepository,
  getMediaStorage,
  getOperationsRepository,
  getUnitRepository,
  type VehicleInventoryServicePorts,
} from "../services/VehicleService/serviceSupport.js";
import { VehicleWorkflowStateError } from "./vehicleSaleWorkflowRules.js";

export type VehicleSaleWorkflowResult = {
  documents: readonly VehicleDocument[];
  financeEntries: readonly FinanceEntryBundle[];
  updatedListing: VehicleListing;
};

export async function completeReservationWorkflow(
  context: ServiceContext,
  input: {
    buyer: VehicleBuyerSnapshot;
    listing: VehicleListing;
    ports: VehicleInventoryServicePorts | undefined;
    reason?: string | null | undefined;
    sale: VehicleSaleBundle;
    signalPayment: VehicleSalePayment;
    unit: VehicleUnit;
  },
): Promise<VehicleSaleWorkflowResult> {
  await saveUnitStatus(context, input, "reserved");
  const financeEntry = await createReservationFinanceEntry({
    financeRepository: getFinanceRepository(input.ports),
    listing: input.listing,
    sale: input.sale,
    sellerUserId: input.sale.sale.sellerUserId,
    signalPayment: input.signalPayment,
    unit: input.unit,
  });
  const [template, store] = await Promise.all([
    getReservationWorkflowTemplate(context, input.ports),
    getVehicleWorkflowStoreBranding(context, input.ports),
  ]);
  const document = buildReservationReceiptDocument({
    buyer: input.buyer,
    listing: input.listing,
    sale: input.sale,
    signalPayment: input.signalPayment,
    ...(store ? { store } : {}),
    template,
    unit: input.unit,
  });
  const storedDocument = await storeWorkflowDocument(
    { ...document, createdByUserId: actorUserId(context) },
    getMediaStorage(input.ports),
  );
  const createdDocument = await getDocumentRepository(input.ports).create(
    storedDocument,
  );
  return {
    documents: [createdDocument],
    financeEntries: [financeEntry],
    updatedListing: input.listing,
  };
}

export async function completeSaleWorkflow(
  context: ServiceContext,
  input: {
    buyer: VehicleBuyerSnapshot;
    listing: VehicleListing;
    ports: VehicleInventoryServicePorts | undefined;
    reason?: string | null | undefined;
    sale: VehicleSaleBundle;
    selectedDocumentKinds?: readonly VehicleSaleDocumentKind[];
    unit: VehicleUnit;
  },
): Promise<VehicleSaleWorkflowResult> {
  const listing = await lockListingForSale(context, input);
  const lockedInput = { ...input, listing };
  await saveUnitStatus(context, lockedInput, "sold");
  const financeEntries = await createSaleFinanceEntries({
    financeRepository: getFinanceRepository(input.ports),
    listing,
    sale: input.sale,
    sellerUserId: input.sale.sale.sellerUserId,
    unit: input.unit,
  });
  const [workflowTemplates, store] = await Promise.all([
    getSaleWorkflowTemplates(context, input.ports),
    getVehicleWorkflowStoreBranding(context, input.ports),
  ]);
  const documents = buildSoldDocuments({
    buyer: input.buyer,
    listing,
    sale: input.sale,
    ...(store ? { store } : {}),
    ...(input.selectedDocumentKinds
      ? { selectedDocumentKinds: input.selectedDocumentKinds }
      : {}),
    ...(workflowTemplates ? { templates: workflowTemplates } : {}),
    unit: input.unit,
  });
  const createdDocuments = [];
  for (const document of documents) {
    const storedDocument = await storeWorkflowDocument(
      { ...document, createdByUserId: actorUserId(context) },
      getMediaStorage(input.ports),
    );
    createdDocuments.push(
      await getDocumentRepository(input.ports).create(storedDocument),
    );
  }
  const updatedListing = await syncListingSoldOutStatus(context, lockedInput);
  return { documents: createdDocuments, financeEntries, updatedListing };
}

async function lockListingForSale(
  context: ServiceContext,
  input: {
    listing: VehicleListing;
    ports: VehicleInventoryServicePorts | undefined;
  },
): Promise<VehicleListing> {
  const listing = await getListingRepository(
    input.ports,
  ).lockForStockTransition({
    listingId: input.listing.id,
    storeId: context.storeId,
    tenantId: context.tenantId,
  });
  if (!listing || listing.status !== "published") {
    throw new VehicleWorkflowStateError(
      "Vehicle listing changed before the sale stock transition could be locked.",
    );
  }
  return listing;
}

async function saveUnitStatus(
  context: ServiceContext,
  input: {
    listing: VehicleListing;
    ports: VehicleInventoryServicePorts | undefined;
    reason?: string | null | undefined;
    unit: VehicleUnit;
  },
  status: "reserved" | "sold",
) {
  const updated = await getUnitRepository(input.ports).saveIfStatus(
    {
      ...input.unit,
      status,
      updatedAt: new Date(),
    },
    input.unit.status,
  );
  if (!updated) {
    throw new VehicleWorkflowStateError(
      `Vehicle unit status changed before it could transition from ${input.unit.status} to ${status}.`,
    );
  }
  await getOperationsRepository(input.ports).createStatusHistory({
    actorUserId: actorUserId(context),
    fromStatus: input.unit.status,
    listingId: input.listing.id,
    reason: input.reason ?? workflowReason(status),
    storeId: context.storeId,
    target: "unit",
    tenantId: context.tenantId,
    toStatus: status,
    unitId: input.unit.id,
  });
}

async function syncListingSoldOutStatus(
  context: ServiceContext,
  input: {
    listing: VehicleListing;
    ports: VehicleInventoryServicePorts | undefined;
    reason?: string | null | undefined;
    unit: VehicleUnit;
  },
): Promise<VehicleListing> {
  const units = await getUnitRepository(input.ports).listByListingIds({
    listingIds: [input.listing.id],
    storeId: context.storeId,
    tenantId: context.tenantId,
  });
  const hasOpenStock = units.some((unit) =>
    ["acquired", "available", "in_preparation", "reserved"].includes(
      unit.status,
    ),
  );
  if (hasOpenStock || input.listing.status === "sold_out") {
    return input.listing;
  }

  const updatedListing = await getListingRepository(input.ports).save({
    ...input.listing,
    status: "sold_out",
    updatedAt: new Date(),
  });
  await getOperationsRepository(input.ports).createStatusHistory({
    actorUserId: actorUserId(context),
    fromStatus: input.listing.status,
    listingId: input.listing.id,
    reason: input.reason ?? workflowReason("sold"),
    storeId: context.storeId,
    target: "listing",
    tenantId: context.tenantId,
    toStatus: "sold_out",
    unitId: null,
  });
  return updatedListing;
}

function workflowReason(status: "reserved" | "sold") {
  return status === "reserved" ? "Reservation workflow" : "Sale workflow";
}
