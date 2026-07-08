import type { AuditFieldChange } from "@lojaveiculosv2/audit";
import type { EntitlementKey, StoreId } from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  AgencyTenantOverview,
  BillingEntitlementStatus,
  StoreEntitlement,
} from "../../ports/billingRepository.js";
import {
  requireTenantBillingScope,
  type BillingServicePorts,
} from "./serviceSupport.js";

export type UpdateAgencyStoreEntitlementServiceInput = {
  endsAt?: Date | null;
  featureKey: EntitlementKey;
  metadata?: Record<string, unknown>;
  reason?: string | null;
  startsAt?: Date | null;
  status: BillingEntitlementStatus;
  storeId: StoreId;
};

export async function updateAgencyStoreEntitlement(
  context: ServiceContext,
  input: UpdateAgencyStoreEntitlementServiceInput,
  ports: BillingServicePorts,
): Promise<AgencyTenantOverview> {
  assertPermission(context, "billing.manage");
  const scope = requireTenantBillingScope(context);
  const before = await ports.billingRepository.getOverview({
    billingManagedBy: "agency",
    currentActorCanManage: context.permissions.includes("billing.manage"),
    storeId: input.storeId,
    tenantId: scope.tenantId as never,
  });
  const beforeEntitlement = before.entitlements.find(
    (entitlement) => entitlement.featureKey === input.featureKey,
  );

  context.logger.info(
    "agency.store_entitlement.update.started",
    createServiceLogMetadata(context, {
      featureKey: input.featureKey,
      nextStatus: input.status,
      previousStatus: beforeEntitlement?.status ?? null,
      targetStoreId: input.storeId,
    }),
  );

  const storeOverview = await ports.billingRepository.updateStoreEntitlement({
    billingManagedBy: "agency",
    featureKey: input.featureKey,
    metadata: input.metadata ?? {},
    actorId: context.actor.kind === "user" ? context.actor.id : null,
    currentActorCanManage: context.permissions.includes("billing.manage"),
    previousStatus: beforeEntitlement?.status ?? null,
    reason: input.reason ?? null,
    source: "agency_billing_console",
    status: input.status,
    storeId: input.storeId,
    tenantId: scope.tenantId as never,
    ...(input.endsAt !== undefined ? { endsAt: input.endsAt } : {}),
    ...(input.startsAt !== undefined ? { startsAt: input.startsAt } : {}),
  });
  const afterEntitlement = storeOverview.entitlements.find(
    (entitlement) => entitlement.featureKey === input.featureKey,
  );

  await context.audit.record({
    action: "agency.store_entitlement.update",
    actor: context.actor,
    category: "data_change",
    changes: createChanges(beforeEntitlement, afterEntitlement),
    criticality: "critical",
    entityId: input.storeId,
    entityType: "store_entitlement",
    metadata: {
      featureKey: input.featureKey,
      status: input.status,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: input.storeId,
    tenantId: scope.tenantId,
    summary: "Updated agency-managed store entitlement",
  });

  return ports.billingRepository.getTenantOverview({
    currentActorCanManage: context.permissions.includes("billing.manage"),
    tenantId: scope.tenantId as never,
  });
}

function createChanges(
  before: StoreEntitlement | undefined,
  after: StoreEntitlement | undefined,
): AuditFieldChange[] {
  return [
    change("status", before?.status, after?.status),
    change("source", before?.source, after?.source),
    change("startsAt", dateValue(before?.startsAt), dateValue(after?.startsAt)),
    change("endsAt", dateValue(before?.endsAt), dateValue(after?.endsAt)),
  ].filter(Boolean) as AuditFieldChange[];
}

function change(path: string, before: unknown, after: unknown) {
  if (JSON.stringify(before ?? null) === JSON.stringify(after ?? null))
    return null;
  return {
    after: toAuditValue(after),
    before: toAuditValue(before),
    path,
  };
}

function dateValue(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function toAuditValue(value: unknown) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value;
  return JSON.parse(JSON.stringify(value)) as string | number | boolean | null;
}
