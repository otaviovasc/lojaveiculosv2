import type {
  AuditEntityReference,
  AuditFieldChange,
  SafeAuditMetadata,
} from "@lojaveiculosv2/audit";
import type { PermissionKey } from "@lojaveiculosv2/shared";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { ObjectStorage } from "../../../../shared/storage/objectStorage.js";
import type { DocumentRepository } from "../../../documents/ports/documentRepository.js";
import type {
  FinanceEntryBundle,
  FinanceRepository,
} from "../../ports/financeRepository.js";
import type { FinanceServicePorts } from "./types.js";
export type { FinanceServicePorts } from "./types.js";

export class FinanceServicePortError extends Error {
  constructor(portName: string) {
    super(`Finance service port is not configured: ${portName}`);
    this.name = "FinanceServicePortError";
  }
}

export class FinanceEntryNotFoundError extends Error {
  constructor(entryId: string) {
    super(`Finance entry not found: ${entryId}`);
    this.name = "FinanceEntryNotFoundError";
  }
}

export function getFinanceRepository(
  ports: FinanceServicePorts | undefined,
): FinanceRepository {
  return requirePort(ports?.financeRepository, "financeRepository");
}

export function getDocumentRepository(
  ports: FinanceServicePorts | undefined,
): DocumentRepository {
  return requirePort(ports?.documentRepository, "documentRepository");
}

export function getObjectStorage(
  ports: FinanceServicePorts | undefined,
): ObjectStorage {
  return requirePort(ports?.objectStorage, "objectStorage");
}

export async function findScopedFinanceEntry(
  context: ServiceContext,
  repository: FinanceRepository,
  entryId: string,
): Promise<FinanceEntryBundle> {
  const bundle = await repository.findById({
    entryId,
    storeId: context.storeId,
    tenantId: context.tenantId,
  });

  if (!bundle) throw new FinanceEntryNotFoundError(entryId);
  return bundle;
}

export function requireFinanceScope(context: ServiceContext): {
  storeId: string;
  tenantId: string;
} {
  if (!context.storeId || !context.tenantId) {
    throw new Error("Finance service requires tenant and store scope.");
  }

  return { storeId: context.storeId, tenantId: context.tenantId };
}

export function financeEntryStoragePrefix(
  scope: { storeId: string; tenantId: string },
  entryId: string,
): string {
  return financeEntryStorageScope(scope, entryId).join("/");
}

export function financeEntryStorageScope(
  scope: { storeId: string; tenantId: string },
  entryId: string,
): readonly string[] {
  return [
    "tenants",
    scope.tenantId,
    "stores",
    scope.storeId,
    "finance-entries",
    entryId,
    "documents",
  ];
}

export function logFinanceServiceEvent(
  context: ServiceContext,
  event: string,
  metadata: SafeAuditMetadata = {},
): void {
  context.logger.info(event, createServiceLogMetadata(context, metadata));
}

export async function auditFinanceServiceEvent(
  context: ServiceContext,
  input: {
    action: string;
    category: "data_access" | "data_change";
    changes?: readonly AuditFieldChange[];
    entityId: string;
    entityType?: "finance_entry" | "finance_document";
    metadata?: SafeAuditMetadata;
    permission: PermissionKey;
    relatedEntities?: readonly AuditEntityReference[];
    summary: string;
  },
): Promise<void> {
  await context.audit.record({
    action: input.action,
    actor: context.actor,
    category: input.category,
    entityId: input.entityId,
    entityType: input.entityType ?? "finance_entry",
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
    ...(input.relatedEntities
      ? { relatedEntities: input.relatedEntities }
      : {}),
    ...(context.correlationId ? { correlationId: context.correlationId } : {}),
    ...(context.request ? { request: context.request } : {}),
    ...(context.source ? { source: context.source } : {}),
  });
}

export function actorUserId(context: ServiceContext): string | null {
  if (context.actor.kind !== "user") return null;
  return isUuid(context.actor.id) ? context.actor.id : null;
}

function requirePort<T>(port: T | undefined, portName: string): T {
  if (port) return port;
  throw new FinanceServicePortError(portName);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
