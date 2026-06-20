import type { AuditFieldChange } from "@lojaveiculosv2/audit";
import type { EntitlementKey } from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  BillingEntitlementStatus,
  BillingOverview,
  StoreEntitlement,
} from "../../ports/billingRepository.js";
import {
  requireBillingScope,
  type BillingServicePorts,
} from "./serviceSupport.js";

export type UpdateStoreEntitlementServiceInput = {
  endsAt?: Date | null;
  featureKey: EntitlementKey;
  metadata?: Record<string, unknown>;
  reason?: string | null;
  startsAt?: Date | null;
  status: BillingEntitlementStatus;
};

export async function updateStoreEntitlement(
  context: ServiceContext,
  input: UpdateStoreEntitlementServiceInput,
  ports: BillingServicePorts,
): Promise<BillingOverview> {
  assertPermission(context, "billing.manage");
  const scope = requireBillingScope(context);
  const before = await ports.billingRepository.getOverview({
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  const beforeEntitlement = before.entitlements.find(
    (entitlement) => entitlement.featureKey === input.featureKey,
  );

  context.logger.info(
    "billing.entitlement.update.started",
    createServiceLogMetadata(context, {
      featureKey: input.featureKey,
      nextStatus: input.status,
      previousStatus: beforeEntitlement?.status ?? null,
    }),
  );

  const overview = await ports.billingRepository.updateStoreEntitlement({
    featureKey: input.featureKey,
    metadata: input.metadata ?? {},
    actorId: context.actor.kind === "user" ? context.actor.id : null,
    previousStatus: beforeEntitlement?.status ?? null,
    reason: input.reason ?? null,
    source: "billing_console",
    status: input.status,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
    ...(input.endsAt !== undefined ? { endsAt: input.endsAt } : {}),
    ...(input.startsAt !== undefined ? { startsAt: input.startsAt } : {}),
  });
  const afterEntitlement = overview.entitlements.find(
    (entitlement) => entitlement.featureKey === input.featureKey,
  );

  await context.audit.record({
    action: "billing.entitlement.update",
    actor: context.actor,
    category: "data_change",
    changes: createChanges(beforeEntitlement, afterEntitlement),
    criticality: "critical",
    entityId: scope.storeId,
    entityType: "store_entitlement",
    metadata: {
      featureKey: input.featureKey,
      status: input.status,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Updated store entitlement",
  });

  return overview;
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
