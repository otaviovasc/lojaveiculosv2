import { assertPermission } from "../../../../shared/authorization.js";
import type { PermissionKey } from "@lojaveiculosv2/shared";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  auditVehicleServiceEvent,
  findScopedListing,
  getChecklistRepository,
  getListingRepository,
  getDocumentRepository,
  getMediaRepository,
  getOperationsRepository,
  getUnitRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";
import {
  createListingDetail,
  type VehicleListingDetail,
} from "../../readModels/vehicleReadModels.js";

const permission = "inventory.read";

export type GetVehicleListingDetailInput = {
  listingId: string;
  permission?: PermissionKey;
};

export async function getVehicleListingDetail(
  context: ServiceContext,
  input: GetVehicleListingDetailInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleListingDetail> {
  const effectivePermission = input.permission ?? permission;
  assertPermission(context, effectivePermission);
  const listing = await findScopedListing(
    context,
    getListingRepository(ports),
    input.listingId,
  );
  const scope = { storeId: context.storeId, tenantId: context.tenantId };
  const listingIds = [listing.id];
  const [units, media] = await Promise.all([
    getUnitRepository(ports).listByListingIds({ ...scope, listingIds }),
    getMediaRepository(ports).listByListingIds({ ...scope, listingIds }),
  ]);
  const documents = ports?.documentRepository
    ? await getDocumentRepository(ports).listByListing({
        ...scope,
        listingId: listing.id,
        unitIds: units.map((unit) => unit.id),
      })
    : [];
  const [costs, priceHistory, statusHistory] = ports?.operationsRepository
    ? await Promise.all([
        getOperationsRepository(ports).listCostsByUnitIds({
          ...scope,
          unitIds: units.map((unit) => unit.id),
        }),
        getOperationsRepository(ports).listPriceHistoryByListing({
          ...scope,
          listingId: listing.id,
        }),
        getOperationsRepository(ports).listStatusHistoryByListing({
          ...scope,
          listingId: listing.id,
        }),
      ])
    : [[], [], []];
  const checklists = ports?.checklistRepository
    ? await getChecklistRepository(ports).listByUnitIds({
        ...scope,
        unitIds: units.map((unit) => unit.id),
      })
    : [];

  logVehicleServiceEvent(context, "vehicle_listing.detail.read", {
    listingId: listing.id,
    checklistCount: checklists.length,
    documentCount: documents.length,
    costCount: costs.length,
    mediaCount: media.length,
    priceHistoryCount: priceHistory.length,
    statusHistoryCount: statusHistory.length,
    unitCount: units.length,
  });

  await auditVehicleServiceEvent(context, {
    action: "vehicle_listing.detail.read",
    category: "data_access",
    entityId: listing.id,
    metadata: {
      mediaCount: media.length,
      permission: effectivePermission,
      checklistCount: checklists.length,
      costCount: costs.length,
      documentCount: documents.length,
      priceHistoryCount: priceHistory.length,
      statusHistoryCount: statusHistory.length,
      unitCount: units.length,
    },
    permission: effectivePermission,
    summary: "Read vehicle listing detail",
  });

  return createListingDetail({
    checklists,
    costs,
    documents,
    listing,
    media,
    priceHistory,
    statusHistory,
    units,
  });
}
