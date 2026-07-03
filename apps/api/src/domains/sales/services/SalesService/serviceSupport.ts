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
import type {
  SaleRecord,
  SalesRepository,
  SaleScope,
} from "../../ports/salesRepository.js";

export type SalesServicePorts = {
  salesRepository: SalesRepository;
};

export class SalesServicePortError extends Error {
  constructor(portName: string) {
    super(`Sales service port is not configured: ${portName}`);
    this.name = "SalesServicePortError";
  }
}

export class SaleNotFoundError extends Error {
  constructor(saleId: string) {
    super(`Sale not found: ${saleId}`);
    this.name = "SaleNotFoundError";
  }
}

export class SaleReadinessError extends Error {
  constructor(readonly missingFields: readonly string[]) {
    super(`Sale is missing required fields: ${missingFields.join(", ")}`);
    this.name = "SaleReadinessError";
  }
}

export class SaleTransitionStateError extends Error {
  constructor(
    readonly currentStatus: SaleRecord["status"],
    readonly nextStatus: SaleRecord["status"],
  ) {
    super(`Sale cannot transition from ${currentStatus} to ${nextStatus}.`);
    this.name = "SaleTransitionStateError";
  }
}

export class SaleDraftDeletionStateError extends Error {
  constructor(readonly currentStatus: SaleRecord["status"]) {
    super(
      `Sale draft can only be deleted while draft. Current status: ${currentStatus}.`,
    );
    this.name = "SaleDraftDeletionStateError";
  }
}

export class SaleReferenceError extends Error {
  constructor(readonly reference: "lead" | "vehicle_unit" | "unknown") {
    super(referenceMessage(reference));
    this.name = "SaleReferenceError";
  }
}

function referenceMessage(reference: "lead" | "vehicle_unit" | "unknown") {
  if (reference === "lead") return "Referenced lead was not found.";
  if (reference === "vehicle_unit") {
    return "Referenced vehicle unit was not found.";
  }
  return "Referenced sales record dependency was not found.";
}

export function getSalesRepository(
  ports: SalesServicePorts | undefined,
): SalesRepository {
  if (ports?.salesRepository) return ports.salesRepository;
  throw new SalesServicePortError("salesRepository");
}

export function requireSaleScope(context: ServiceContext): SaleScope {
  if (!context.storeId || !context.tenantId) {
    throw new Error("Sales service requires tenant and store scope.");
  }
  return { storeId: context.storeId, tenantId: context.tenantId };
}

export async function findScopedSale(
  repository: SalesRepository,
  scope: SaleScope,
  saleId: string,
): Promise<SaleRecord> {
  const sale = await repository.findById(scope, saleId);
  if (!sale) throw new SaleNotFoundError(saleId);
  return sale;
}

export function validateSaleReadiness(sale: SaleRecord): void {
  const missing = collectMissingSaleFields(sale);
  if (missing.length) throw new SaleReadinessError(missing);
}

export function collectMissingSaleFields(sale: SaleRecord): readonly string[] {
  const missing: string[] = [];
  if (!hasBuyerName(sale.buyerSnapshot)) missing.push("buyer");
  if (!sale.leadId) missing.push("lead");
  if (!sale.unitId) missing.push("vehicle_unit");
  if (!sale.sellerUserId) missing.push("seller");
  if (!sale.salePriceCents || sale.salePriceCents <= 0) {
    missing.push("sale_price");
  }
  const principalTotal = sale.payments.reduce(
    (total, payment) => total + payment.principalCents,
    0,
  );
  if (sale.salePriceCents && principalTotal < sale.salePriceCents) {
    missing.push("payment_principal_coverage");
  }

  for (const kind of readRequiredDocumentKinds(sale.documentPolicySnapshot)) {
    if (!sale.selectedDocumentKinds.includes(kind)) {
      missing.push(`document:${kind}`);
    }
  }

  return missing;
}

function hasBuyerName(snapshot: Record<string, unknown>): boolean {
  return typeof snapshot.name === "string" && snapshot.name.trim().length > 0;
}

export function logSalesServiceEvent(
  context: ServiceContext,
  event: string,
  metadata: SafeAuditMetadata = {},
): void {
  context.logger.info(event, createServiceLogMetadata(context, metadata));
}

export async function auditSalesServiceEvent(
  context: ServiceContext,
  input: {
    action: string;
    category: "data_access" | "data_change";
    changes?: readonly AuditFieldChange[];
    entityId: string;
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
    entityType: "sale",
    metadata: { permission: input.permission, ...(input.metadata ?? {}) },
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

function readRequiredDocumentKinds(
  snapshot: Record<string, unknown>,
): readonly string[] {
  const direct = snapshot.requiredDocumentKinds;
  if (Array.isArray(direct)) {
    return direct.filter((value): value is string => typeof value === "string");
  }
  const policy = snapshot.policy;
  if (!policy || typeof policy !== "object") return [];
  const required = (policy as { requiredDocumentKinds?: unknown })
    .requiredDocumentKinds;
  if (!Array.isArray(required)) return [];
  return required.filter((value): value is string => typeof value === "string");
}
