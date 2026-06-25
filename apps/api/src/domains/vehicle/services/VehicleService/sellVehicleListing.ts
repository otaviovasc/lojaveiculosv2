import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { assertStoreUserActor } from "../../authorization/storeWorkflowActor.js";
import { storeWorkflowDocument } from "../../documents/storeWorkflowDocument.js";
import { buildSoldDocuments } from "../../documents/vehicleWorkflowDocuments.js";
import { createSaleFinanceEntry } from "../../finance/vehicleFinanceEntries.js";
import type { VehicleBuyerSnapshot } from "../../ports/vehicleSalesRepository.js";
import type {
  VehicleListing,
  VehicleUnit,
} from "../../ports/vehicleInventoryRepository.js";
import {
  actorUserId,
  auditVehicleServiceEvent,
  findScopedListing,
  findScopedUnit,
  getDocumentRepository,
  getDocumentTemplateRepository,
  getFinanceRepository,
  getListingRepository,
  getMediaStorage,
  getOperationsRepository,
  getSalesRepository,
  getUnitRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";
import {
  VehicleWorkflowStateError,
  VehicleWorkflowValidationError,
} from "./reserveVehicleListing.js";

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
  assertSaleState(listing, unit);
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
  const financeEntry = await createSaleFinanceEntry({
    financeRepository: getFinanceRepository(ports),
    listing,
    paymentMethod: input.paymentMethod,
    sale,
    sellerUserId: actorUserId(context),
    unit,
  });
  const soldListing = {
    ...listing,
    status: "sold",
    updatedAt: new Date(),
  } as const;

  const workflowTemplates = await getWorkflowTemplates(context, ports);
  const documents = buildSoldDocuments({
    buyer: input.buyer,
    listing: soldListing,
    paymentMethod: input.paymentMethod,
    sale,
    ...(workflowTemplates ? { templates: workflowTemplates } : {}),
    unit,
  });
  const createdDocuments = [];
  for (const document of documents) {
    const storedDocument = await storeWorkflowDocument(
      {
        ...document,
        createdByUserId: actorUserId(context),
      },
      getMediaStorage(ports),
    );
    createdDocuments.push(
      await getDocumentRepository(ports).create(storedDocument),
    );
  }
  const updatedListing = await listingRepository.save(soldListing);
  await unitRepository.save({ ...unit, status: "sold", updatedAt: new Date() });
  await getOperationsRepository(ports).createStatusHistory({
    actorUserId: actorUserId(context),
    fromStatus: listing.status,
    listingId: listing.id,
    reason: input.reason ?? "Sale workflow",
    storeId: context.storeId,
    target: "listing",
    tenantId: context.tenantId,
    toStatus: "sold",
    unitId: null,
  });
  await getOperationsRepository(ports).createStatusHistory({
    actorUserId: actorUserId(context),
    fromStatus: unit.status,
    listingId: listing.id,
    reason: input.reason ?? "Sale workflow",
    storeId: context.storeId,
    target: "unit",
    tenantId: context.tenantId,
    toStatus: "sold",
    unitId: unit.id,
  });

  await auditVehicleServiceEvent(context, {
    action: "vehicle_listing.sell",
    category: "data_change",
    changes: [{ after: "sold", before: listing.status, path: "status" }],
    entityId: listing.id,
    metadata: {
      documentCount: documents.length,
      documentIds: createdDocuments.map((document) => document.id),
      financeEntryId: financeEntry.entry.id,
      saleId: sale.sale.id,
      salePaymentId: sale.payment?.id ?? null,
      salePriceCents,
    },
    permission,
    relatedEntities: [
      { id: sale.sale.id, type: "vehicle_sale" },
      { id: financeEntry.entry.id, type: "finance_entry" },
    ],
    summary: "Sold vehicle listing and emitted sale document bundle",
  });

  return updatedListing;
}

function assertSaleState(listing: VehicleListing, unit: VehicleUnit) {
  if (listing.status !== "available" && listing.status !== "reserved") {
    throw new VehicleWorkflowStateError(
      `Vehicle listing must be available or reserved to sell; current status is ${listing.status}.`,
    );
  }
  if (unit.status !== "available" && unit.status !== "reserved") {
    throw new VehicleWorkflowStateError(
      `Vehicle unit must be available or reserved to sell; current status is ${unit.status}.`,
    );
  }
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
