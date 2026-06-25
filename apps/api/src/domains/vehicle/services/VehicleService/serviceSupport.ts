import type {
  AuditEntityReference,
  AuditFailureTier,
  AuditFieldChange,
  AuditOutcome,
  SafeAuditMetadata,
} from "@lojaveiculosv2/audit";
import type { PermissionKey } from "@lojaveiculosv2/shared";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  VehicleMediaRepository,
  VehicleDocumentRepository,
  VehicleListing,
  VehicleListingRepository,
  VehicleMedia,
  VehicleUnit,
  VehicleUnitRepository,
} from "../../ports/vehicleInventoryRepository.js";
import type { FinanceRepository } from "../../../finance/ports/financeRepository.js";
import type { DocumentRepository } from "../../../documents/ports/documentRepository.js";
import type { VehicleOperationsRepository } from "../../ports/vehicleOperationsRepository.js";
import type { VehicleSalesRepository } from "../../ports/vehicleSalesRepository.js";
import type { VehicleChecklistRepository } from "../../ports/vehicleChecklistRepository.js";
import type { VehicleCatalogProvider } from "../../ports/vehicleCatalogProvider.js";
import type { VehicleCatalogRepository } from "../../ports/vehicleCatalogRepository.js";
import type { VehicleMediaStorage } from "../../ports/vehicleMediaStorage.js";
import type { VehicleInventoryServicePorts } from "./types.js";
export type { VehicleInventoryServicePorts } from "./types.js";

export class VehicleInventoryRepositoryError extends Error {
  constructor(portName: string) {
    super(`Vehicle inventory repository port is not configured: ${portName}`);
    this.name = "VehicleInventoryRepositoryError";
  }
}

export function getCatalogRepository(
  ports: VehicleInventoryServicePorts | undefined,
): VehicleCatalogRepository {
  return requirePort(ports?.catalogRepository, "catalogRepository");
}

export class VehicleListingNotFoundError extends Error {
  constructor(listingId: string) {
    super(`Vehicle listing not found: ${listingId}`);
    this.name = "VehicleListingNotFoundError";
  }
}

export class VehicleUnitNotFoundError extends Error {
  constructor(unitId: string) {
    super(`Vehicle unit not found: ${unitId}`);
    this.name = "VehicleUnitNotFoundError";
  }
}

export class VehicleMediaNotFoundError extends Error {
  constructor(mediaId: string) {
    super(`Vehicle media not found: ${mediaId}`);
    this.name = "VehicleMediaNotFoundError";
  }
}

export function getListingRepository(
  ports: VehicleInventoryServicePorts | undefined,
): VehicleListingRepository {
  return requirePort(ports?.listingRepository, "listingRepository");
}

export function getUnitRepository(
  ports: VehicleInventoryServicePorts | undefined,
): VehicleUnitRepository {
  return requirePort(ports?.unitRepository, "unitRepository");
}

export function getMediaRepository(
  ports: VehicleInventoryServicePorts | undefined,
): VehicleMediaRepository {
  return requirePort(ports?.mediaRepository, "mediaRepository");
}

export function getDocumentRepository(
  ports: VehicleInventoryServicePorts | undefined,
): VehicleDocumentRepository {
  return requirePort(ports?.documentRepository, "documentRepository");
}

export function getChecklistRepository(
  ports: VehicleInventoryServicePorts | undefined,
): VehicleChecklistRepository {
  return requirePort(ports?.checklistRepository, "checklistRepository");
}

export function getDocumentTemplateRepository(
  ports: VehicleInventoryServicePorts | undefined,
): Pick<DocumentRepository, "findTemplate"> | null {
  return ports?.documentTemplateRepository ?? null;
}

export function getFinanceRepository(
  ports: VehicleInventoryServicePorts | undefined,
): FinanceRepository {
  return requirePort(ports?.financeRepository, "financeRepository");
}

export function getOperationsRepository(
  ports: VehicleInventoryServicePorts | undefined,
): VehicleOperationsRepository {
  return requirePort(ports?.operationsRepository, "operationsRepository");
}

export function getSalesRepository(
  ports: VehicleInventoryServicePorts | undefined,
): VehicleSalesRepository {
  return requirePort(ports?.salesRepository, "salesRepository");
}

export function getMediaStorage(
  ports: VehicleInventoryServicePorts | undefined,
): VehicleMediaStorage {
  return requirePort(ports?.mediaStorage, "mediaStorage");
}

function requirePort<T>(port: T | undefined, portName: string): T {
  if (port) return port;
  throw new VehicleInventoryRepositoryError(portName);
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

  if (!listing) throw new VehicleListingNotFoundError(listingId);

  return listing;
}

export async function findScopedUnit(
  context: ServiceContext,
  repository: VehicleUnitRepository,
  input: { listingId: string; unitId: string },
): Promise<VehicleUnit> {
  const unit = await repository.findById({
    listingId: input.listingId,
    storeId: context.storeId,
    tenantId: context.tenantId,
    unitId: input.unitId,
  });

  if (!unit) throw new VehicleUnitNotFoundError(input.unitId);

  return unit;
}

export async function findScopedMedia(
  context: ServiceContext,
  repository: VehicleMediaRepository,
  input: { listingId: string; mediaId: string },
): Promise<VehicleMedia> {
  const media = await repository.findById({
    listingId: input.listingId,
    mediaId: input.mediaId,
    storeId: context.storeId,
    tenantId: context.tenantId,
  });

  if (!media) throw new VehicleMediaNotFoundError(input.mediaId);

  return media;
}

export function logVehicleServiceEvent(
  context: ServiceContext,
  event: string,
  metadata: SafeAuditMetadata = {},
): void {
  context.logger.info(event, createServiceLogMetadata(context, metadata));
}

export function actorUserId(context: ServiceContext): string | null {
  if (context.actor.kind !== "user") return null;
  return isUuid(context.actor.id) ? context.actor.id : null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function auditVehicleServiceEvent(
  context: ServiceContext,
  input: {
    action: string;
    category: "data_access" | "data_change";
    changes?: readonly AuditFieldChange[];
    entityId: string;
    entityType?:
      | "vehicle_document"
      | "vehicle_checklist"
      | "vehicle_listing"
      | "vehicle_media"
      | "vehicle_operation"
      | "vehicle_sale"
      | "vehicle_unit";
    failureTier?: AuditFailureTier;
    metadata?: SafeAuditMetadata;
    outcome?: AuditOutcome;
    permission: PermissionKey;
    relatedEntities?: readonly AuditEntityReference[];
    summary: string;
  },
): Promise<void> {
  const failureTier = input.failureTier ?? context.auditFailureTier;
  await context.audit.record({
    action: input.action,
    actor: context.actor,
    category: input.category,
    entityId: input.entityId,
    entityType: input.entityType ?? "vehicle_listing",
    metadata: { permission: input.permission, ...(input.metadata ?? {}) },
    outcome: input.outcome ?? "succeeded",
    requestId: context.requestId,
    storeId: context.storeId,
    summary: input.summary,
    tenantId: context.tenantId,
    ...(failureTier ? { failureTier } : {}),
    ...(input.changes ? { changes: input.changes } : {}),
    ...(input.relatedEntities
      ? { relatedEntities: input.relatedEntities }
      : {}),
    ...(context.correlationId ? { correlationId: context.correlationId } : {}),
    ...(context.request ? { request: context.request } : {}),
    ...(context.source ? { source: context.source } : {}),
  });
}
