import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import type { InferSelectModel } from "drizzle-orm";
import type { leadActivities, leads } from "@lojaveiculosv2/db";
import type {
  CrmLead,
  CrmLeadActivity,
} from "../../../domains/crm/ports/crmRepository.js";

export type LeadRow = InferSelectModel<typeof leads>;
export type ActivityRow = InferSelectModel<typeof leadActivities>;
export type LeadVehicleReference = {
  listingId: string | null;
  vehicleTitle: string | null;
};

export function toLead(
  row: LeadRow,
  reference?: LeadVehicleReference,
): CrmLead {
  return {
    assignedUserId: row.assignedUserId as UserId | null,
    buyerEmail: row.buyerEmail,
    buyerName: row.buyerName,
    buyerPhone: row.buyerPhone,
    createdAt: row.createdAt,
    id: row.id,
    lastInteractionAt: row.lastInteractionAt,
    listingId: reference?.listingId ?? null,
    metadata: toRecord(row.metadata),
    pipelineId: row.pipelineId,
    pipelineStageId: row.pipelineStageId,
    source: row.source,
    status: row.status,
    storeId: row.storeId as StoreId,
    tenantId: row.tenantId as TenantId,
    updatedAt: row.updatedAt,
    vehicleTitle: reference?.vehicleTitle ?? null,
  };
}

export function toActivity(row: ActivityRow): CrmLeadActivity {
  return {
    activityType: row.activityType,
    content: row.content,
    createdAt: row.createdAt,
    createdByUserId: row.createdByUserId as UserId | null,
    direction: row.direction,
    id: row.id,
    idempotencyFingerprint: row.idempotencyFingerprint,
    idempotencyKey: row.idempotencyKey,
    leadId: row.leadId,
    metadata: toRecord(row.metadata),
    occurredAt: row.occurredAt,
    priority: row.priority,
    storeId: row.storeId as StoreId,
    tenantId: row.tenantId as TenantId,
    updatedAt: row.updatedAt,
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
