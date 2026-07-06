import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { InferSelectModel } from "drizzle-orm";
import type { crmPipelineStages, crmPipelines } from "@lojaveiculosv2/db";
import type {
  CrmPipeline,
  CrmPipelineStage,
} from "../../../domains/crm/ports/crmPipelineRepository.js";
import type { LeadStatus } from "../../../domains/crm/ports/crmRepository.js";

export type CrmPipelineRow = InferSelectModel<typeof crmPipelines>;
export type CrmPipelineStageRow = InferSelectModel<typeof crmPipelineStages>;

export function toCrmPipeline(
  row: CrmPipelineRow,
  stages: CrmPipelineStageRow[],
): CrmPipeline {
  return {
    createdAt: row.createdAt,
    description: row.description,
    id: row.id,
    isDefault: row.isDefault,
    name: row.name,
    rotationActive: row.rotationActive,
    stages: stages.map(toCrmPipelineStage),
    storeId: row.storeId as StoreId,
    tenantId: row.tenantId as TenantId,
    updatedAt: row.updatedAt,
  };
}

export function toCrmPipelineStage(row: CrmPipelineStageRow): CrmPipelineStage {
  return {
    color: row.color,
    createdAt: row.createdAt,
    id: row.id,
    isSystem: row.isSystem,
    leadStatus: row.leadStatus as LeadStatus,
    name: row.name,
    pipelineId: row.pipelineId,
    slaDays: row.slaDays,
    sortOrder: row.sortOrder,
    status: row.status,
    storeId: row.storeId as StoreId,
    tenantId: row.tenantId as TenantId,
    updatedAt: row.updatedAt,
  };
}
