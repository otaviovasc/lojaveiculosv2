import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { FinanceEntryBundle } from "../../finance/ports/financeRepository.js";
import type { VehicleDocument } from "../ports/vehicleInventoryRepository.js";
import type {
  VehicleBuyerSnapshot,
  VehicleSaleBundle,
} from "../ports/vehicleSalesRepository.js";
import type {
  VehicleListing,
  VehicleUnit,
} from "../ports/vehicleInventoryRepository.js";
import { buildReservationReceiptDocument } from "../documents/vehicleWorkflowDocuments.js";
import { storeWorkflowDocument } from "../documents/storeWorkflowDocument.js";
import { buildSoldDocuments } from "../documents/vehicleWorkflowDocuments.js";
import {
  createReservationFinanceEntry,
  createSaleFinanceEntry,
} from "../finance/vehicleFinanceEntries.js";
import {
  actorUserId,
  getDocumentRepository,
  getDocumentTemplateRepository,
  getFinanceRepository,
  getListingRepository,
  getMediaStorage,
  getOperationsRepository,
  getUnitRepository,
  type VehicleInventoryServicePorts,
} from "../services/VehicleService/serviceSupport.js";

export type VehicleSaleWorkflowResult = {
  documents: readonly VehicleDocument[];
  financeEntry: FinanceEntryBundle;
  updatedListing: VehicleListing;
};

export async function completeReservationWorkflow(
  context: ServiceContext,
  input: {
    buyer: VehicleBuyerSnapshot;
    listing: VehicleListing;
    paymentMethod: string;
    ports: VehicleInventoryServicePorts | undefined;
    reason?: string | null | undefined;
    sale: VehicleSaleBundle;
    signalAmountCents: number;
    unit: VehicleUnit;
  },
): Promise<VehicleSaleWorkflowResult> {
  const financeEntry = await createReservationFinanceEntry({
    financeRepository: getFinanceRepository(input.ports),
    listing: input.listing,
    paymentMethod: input.paymentMethod,
    sale: input.sale,
    sellerUserId: input.sale.sale.sellerUserId,
    signalAmountCents: input.signalAmountCents,
    unit: input.unit,
  });
  const document = buildReservationReceiptDocument({
    buyer: input.buyer,
    listing: input.listing,
    paymentMethod: input.paymentMethod,
    sale: input.sale,
    signalAmountCents: input.signalAmountCents,
    template: await getWorkflowTemplate(context, input.ports),
    unit: input.unit,
  });
  const storedDocument = await storeWorkflowDocument(
    { ...document, createdByUserId: actorUserId(context) },
    getMediaStorage(input.ports),
  );
  const createdDocument = await getDocumentRepository(input.ports).create(
    storedDocument,
  );
  await saveUnitStatus(context, input, "reserved");
  return {
    documents: [createdDocument],
    financeEntry,
    updatedListing: input.listing,
  };
}

export async function completeSaleWorkflow(
  context: ServiceContext,
  input: {
    buyer: VehicleBuyerSnapshot;
    listing: VehicleListing;
    paymentMethod: string;
    ports: VehicleInventoryServicePorts | undefined;
    reason?: string | null | undefined;
    sale: VehicleSaleBundle;
    unit: VehicleUnit;
  },
): Promise<VehicleSaleWorkflowResult> {
  const financeEntry = await createSaleFinanceEntry({
    financeRepository: getFinanceRepository(input.ports),
    listing: input.listing,
    paymentMethod: input.paymentMethod,
    sale: input.sale,
    sellerUserId: input.sale.sale.sellerUserId,
    unit: input.unit,
  });
  const workflowTemplates = await getWorkflowTemplates(context, input.ports);
  const documents = buildSoldDocuments({
    buyer: input.buyer,
    listing: input.listing,
    paymentMethod: input.paymentMethod,
    sale: input.sale,
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
  await saveUnitStatus(context, input, "sold");
  const updatedListing = await syncListingSoldOutStatus(context, input);
  return { documents: createdDocuments, financeEntry, updatedListing };
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
  await getUnitRepository(input.ports).save({
    ...input.unit,
    status,
    updatedAt: new Date(),
  });
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

async function getWorkflowTemplate(
  context: ServiceContext,
  ports: VehicleInventoryServicePorts | undefined,
) {
  const repository = getDocumentTemplateRepository(ports);
  if (!repository || !context.storeId || !context.tenantId) return null;
  return repository.findTemplate({
    kind: "reservation_receipt",
    storeId: context.storeId,
    tenantId: context.tenantId,
  });
}

async function getWorkflowTemplates(
  context: ServiceContext,
  ports: VehicleInventoryServicePorts | undefined,
) {
  const repository = getDocumentTemplateRepository(ports);
  if (!repository || !context.storeId || !context.tenantId) return undefined;
  const kinds = [
    "sale_contract",
    "sale_receipt",
    "delivery_term",
    "power_of_attorney",
  ] as const;
  const entries = await Promise.all(
    kinds.map(
      async (kind) =>
        [
          kind,
          await repository.findTemplate({
            kind,
            storeId: context.storeId as string,
            tenantId: context.tenantId as string,
          }),
        ] as const,
    ),
  );
  return new Map(
    entries.filter(
      (
        entry,
      ): entry is readonly [
        (typeof entry)[0],
        NonNullable<(typeof entry)[1]>,
      ] => Boolean(entry[1]),
    ),
  );
}

function workflowReason(status: "reserved" | "sold") {
  return status === "reserved" ? "Reservation workflow" : "Sale workflow";
}
