import type {
  AuditFieldChange,
  SafeAuditMetadata,
} from "@lojaveiculosv2/audit";
import type { PermissionKey } from "@lojaveiculosv2/shared";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  VehicleListing,
  VehicleListingRepository,
  VehicleUnitRepository,
} from "../../ports/vehicleInventoryRepository.js";

export type VehicleInventoryServicePorts = {
  listingRepository: VehicleListingRepository;
  unitRepository?: VehicleUnitRepository;
};

export class VehicleInventoryRepositoryError extends Error {
  constructor(portName: string) {
    super(`Vehicle inventory repository port is not configured: ${portName}`);
    this.name = "VehicleInventoryRepositoryError";
  }
}

export class VehicleListingNotFoundError extends Error {
  constructor(listingId: string) {
    super(`Vehicle listing not found: ${listingId}`);
    this.name = "VehicleListingNotFoundError";
  }
}

export function getListingRepository(
  ports: VehicleInventoryServicePorts | undefined,
): VehicleListingRepository {
  if (ports?.listingRepository) return ports.listingRepository;
  throw new VehicleInventoryRepositoryError("listingRepository");
}

export function getUnitRepository(
  ports: VehicleInventoryServicePorts | undefined,
): VehicleUnitRepository {
  if (ports?.unitRepository) return ports.unitRepository;
  throw new VehicleInventoryRepositoryError("unitRepository");
}

export async function findScopedListing(
  context: ServiceContext,
  repository: VehicleListingRepository,
  listingId: string,
): Promise<VehicleListing> {
  const listing = await repository.findById({
    listingId,
    storeId: context.storeId,
    tenantId: context.tenantId,
  });

  if (!listing) {
    throw new VehicleListingNotFoundError(listingId);
  }

  return listing;
}

export function logVehicleServiceEvent(
  context: ServiceContext,
  event: string,
  metadata: SafeAuditMetadata = {},
): void {
  context.logger.info(event, createServiceLogMetadata(context, metadata));
}

export async function auditVehicleServiceEvent(
  context: ServiceContext,
  input: {
    action: string;
    category: "data_access" | "data_change";
    changes?: readonly AuditFieldChange[];
    entityId: string;
    metadata?: SafeAuditMetadata;
    permission: PermissionKey;
    summary: string;
  },
): Promise<void> {
  await context.audit.record({
    action: input.action,
    actor: context.actor,
    category: input.category,
    entityId: input.entityId,
    entityType: "vehicle_listing",
    metadata: {
      permission: input.permission,
      ...(input.metadata ?? {}),
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: context.storeId,
    summary: input.summary,
    tenantId: context.tenantId,
    ...(input.changes ? { changes: input.changes } : {}),
    ...(context.correlationId ? { correlationId: context.correlationId } : {}),
    ...(context.request ? { request: context.request } : {}),
    ...(context.source ? { source: context.source } : {}),
  });
}
