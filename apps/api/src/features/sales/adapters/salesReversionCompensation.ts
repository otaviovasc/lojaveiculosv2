import type { SaleRecord } from "../../../domains/sales/ports/salesRepository.js";
import { SaleReversionCompensationError } from "../../../domains/sales/services/SalesService/serviceSupport.js";
import type { FinanceEntryBundle } from "../../../domains/finance/ports/financeRepository.js";
import type {
  VehicleDocument,
  VehicleListing,
  VehicleUnit,
} from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";
import {
  actorUserId,
  findScopedListing,
  findScopedUnitById,
  getDocumentRepository,
  getFinanceRepository,
  getListingRepository,
  getOperationsRepository,
  getUnitRepository,
  type VehicleInventoryServicePorts,
} from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  assertDocumentOwnership,
  assertFinanceOwnership,
  isProvenPriorCompensation,
} from "./salesReversionCompensationChecks.js";

type CompensationPlan = {
  alreadyCompensated: boolean;
  documents: readonly VehicleDocument[];
  financeEntries: readonly FinanceEntryBundle[];
  listing: VehicleListing;
  saleId: string;
  unit: VehicleUnit;
};

export async function compensateClosedSale(
  context: ServiceContext,
  sale: SaleRecord,
  reason: string,
  ports: VehicleInventoryServicePorts,
): Promise<void> {
  const plan = await prepareCompensation(context, sale, ports);
  await cancelFinanceEntries(sale, plan.financeEntries, ports);
  const voidedDocuments = await getDocumentRepository(ports).voidBySale({
    actorId: context.actor.id,
    at: new Date(),
    reason,
    saleId: sale.id,
    storeId: context.storeId,
    tenantId: context.tenantId,
    unitId: plan.unit.id,
  });
  if (!sameIds(plan.documents, voidedDocuments)) {
    throw new SaleReversionCompensationError(
      "documents",
      "Sale-generated documents changed while reversion was running.",
    );
  }
  await restoreVehicleState(context, plan, reason, ports);
}

async function prepareCompensation(
  context: ServiceContext,
  sale: SaleRecord,
  ports: VehicleInventoryServicePorts,
): Promise<CompensationPlan> {
  if (!sale.unitId) {
    throw new SaleReversionCompensationError(
      "unit",
      "Closed sale has no vehicle unit to restore.",
    );
  }
  const unit = await findScopedUnitById(
    context,
    getUnitRepository(ports),
    sale.unitId,
  );
  if (unit.status !== "sold" && unit.status !== "available") {
    throw new SaleReversionCompensationError(
      "unit",
      `Sold vehicle unit is required; current status is ${unit.status}.`,
    );
  }
  const listing = await findScopedListing(
    context,
    getListingRepository(ports),
    unit.listingId,
  );
  if (listing.status !== "published" && listing.status !== "sold_out") {
    throw new SaleReversionCompensationError(
      "listing",
      `Published or sold-out listing is required; current status is ${listing.status}.`,
    );
  }

  const financeEntries = await getFinanceRepository(ports).list({
    limit: 201,
    offset: 0,
    storeId: context.storeId,
    targetId: sale.id,
    targetType: "sale",
    tenantId: context.tenantId,
  });
  assertFinanceOwnership(sale, unit, financeEntries);

  const allDocuments = await getDocumentRepository(ports).listByListing({
    listingId: listing.id,
    storeId: context.storeId,
    tenantId: context.tenantId,
    unitIds: [unit.id],
  });
  const documents = allDocuments.filter(
    (document) => document.metadata.saleId === sale.id,
  );
  assertDocumentOwnership(sale, documents);
  const alreadyCompensated = unit.status === "available";
  if (
    alreadyCompensated &&
    !isProvenPriorCompensation(sale, financeEntries, documents)
  ) {
    throw new SaleReversionCompensationError(
      "unit",
      "Available vehicle state is not linked to this sale reversion.",
    );
  }
  return {
    alreadyCompensated,
    documents,
    financeEntries,
    listing,
    saleId: sale.id,
    unit,
  };
}

async function cancelFinanceEntries(
  sale: SaleRecord,
  entries: readonly FinanceEntryBundle[],
  ports: VehicleInventoryServicePorts,
): Promise<void> {
  const repository = getFinanceRepository(ports);
  for (const bundle of entries) {
    if (bundle.entry.status === "cancelled") continue;
    await repository.updateEntry({
      entryId: bundle.entry.id,
      metadata: {
        ...bundle.entry.metadata,
        revertedBySaleCorrection: true,
        revertedSaleId: sale.id,
      },
      status: "cancelled",
      storeId: sale.storeId,
      tenantId: sale.tenantId,
    });
  }
}

async function restoreVehicleState(
  context: ServiceContext,
  plan: CompensationPlan,
  reason: string,
  ports: VehicleInventoryServicePorts,
): Promise<void> {
  const now = new Date();
  if (!plan.alreadyCompensated) {
    await getUnitRepository(ports).save({
      ...plan.unit,
      status: "available",
      updatedAt: now,
    });
    await getOperationsRepository(ports).createStatusHistory({
      actorUserId: actorUserId(context),
      fromStatus: plan.unit.status,
      listingId: plan.listing.id,
      reason: `Sale reversion ${plan.saleId}: ${reason}`,
      storeId: context.storeId,
      target: "unit",
      tenantId: context.tenantId,
      toStatus: "available",
      unitId: plan.unit.id,
    });
  }
  if (plan.listing.status === "published") return;
  await getListingRepository(ports).save({
    ...plan.listing,
    status: "published",
    updatedAt: now,
  });
  await getOperationsRepository(ports).createStatusHistory({
    actorUserId: actorUserId(context),
    fromStatus: plan.listing.status,
    listingId: plan.listing.id,
    reason: `Sale reversion ${plan.saleId}: ${reason}`,
    storeId: context.storeId,
    target: "listing",
    tenantId: context.tenantId,
    toStatus: "published",
    unitId: null,
  });
}

function sameIds(
  expected: readonly VehicleDocument[],
  actual: readonly VehicleDocument[],
): boolean {
  if (expected.length !== actual.length) return false;
  const actualIds = new Set(actual.map((item) => item.id));
  return expected.every((item) => actualIds.has(item.id));
}
