import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { VehicleAuditEvent } from "../../ports/vehicleAuditRepository.js";
import {
  auditVehicleServiceEvent,
  findScopedListing,
  getDocumentRepository,
  getListingRepository,
  getMediaRepository,
  getUnitRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.read";

export async function listVehicleAuditEvents(
  context: ServiceContext,
  input: { listingId: string; limit?: number },
  ports?: VehicleInventoryServicePorts,
): Promise<readonly VehicleAuditEvent[]> {
  assertPermission(context, permission);
  const listing = await findScopedListing(
    context,
    getListingRepository(ports),
    input.listingId,
  );
  if (!context.storeId || !context.tenantId) {
    throw new Error("Vehicle audit history requires a store-scoped context.");
  }
  const scope = { storeId: context.storeId, tenantId: context.tenantId };
  const units = ports?.unitRepository
    ? await getUnitRepository(ports).listByListingIds({
        ...scope,
        listingIds: [listing.id],
      })
    : [];
  const unitIds = units.map((unit) => unit.id);
  const [documents, media] = await Promise.all([
    ports?.documentRepository
      ? getDocumentRepository(ports).listByListing({
          ...scope,
          listingId: listing.id,
          unitIds,
        })
      : [],
    ports?.mediaRepository
      ? getMediaRepository(ports).listByUnitIds({ ...scope, unitIds })
      : [],
  ]);
  const entityIds = [
    listing.id,
    ...unitIds,
    ...documents.map((document) => document.id),
    ...media.map((item) => item.id),
  ];
  const auditRepository = ports?.auditRepository;
  if (!auditRepository) {
    throw new Error("Vehicle audit repository is not configured.");
  }
  const events = await auditRepository.listByEntityIds({
    ...scope,
    entityIds,
    limit: input.limit ?? 50,
  });

  logVehicleServiceEvent(context, "vehicle_listing.audit.read", {
    eventCount: events.length,
    listingId: listing.id,
  });
  await auditVehicleServiceEvent(context, {
    action: "vehicle_listing.audit.read",
    category: "data_access",
    entityId: listing.id,
    metadata: { eventCount: events.length },
    permission,
    summary: "Read vehicle listing audit trail",
  });

  return events;
}
