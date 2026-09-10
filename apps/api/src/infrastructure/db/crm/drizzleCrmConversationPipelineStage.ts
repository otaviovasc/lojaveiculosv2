import { and, eq, inArray } from "drizzle-orm";
import { crmPipelineStages, crmPipelines, leads } from "@lojaveiculosv2/db";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  CrmConversationCycle,
  CrmConversationCycleLeadPipelineStage,
} from "../../../domains/crm/ports/crmConversationRepositoryModels.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

// `leadId` lives in cycle metadata without a FK; only canonical uuid lead ids
// can join the leads table, anything else would fail the Postgres uuid cast.
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function attachLeadPipelineStages(
  cycles: readonly CrmConversationCycle[],
  stagesByLeadId: ReadonlyMap<string, CrmConversationCycleLeadPipelineStage>,
): CrmConversationCycle[] {
  return cycles.map((cycle) => {
    const leadPipelineStage = cycle.leadId
      ? (stagesByLeadId.get(cycle.leadId) ?? null)
      : null;
    return leadPipelineStage ? { ...cycle, leadPipelineStage } : cycle;
  });
}

/**
 * Batch-resolves the pipeline stage of every listed cycle's lead in one query,
 * scoped to the store/tenant and skipping soft-deleted leads and stages.
 */
export async function enrichCyclesWithLeadPipelineStages(
  db: DrizzleCrmClient,
  scope: { storeId: StoreId; tenantId: TenantId },
  cycles: readonly CrmConversationCycle[],
): Promise<CrmConversationCycle[]> {
  const leadIds = [
    ...new Set(
      cycles
        .map((cycle) => cycle.leadId)
        .filter(
          (leadId): leadId is string =>
            typeof leadId === "string" && uuidPattern.test(leadId),
        ),
    ),
  ];
  if (!leadIds.length) return [...cycles];
  const rows = await db
    .select({
      leadId: leads.id,
      pipelineName: crmPipelines.name,
      stageColor: crmPipelineStages.color,
      stageId: crmPipelineStages.id,
      stageName: crmPipelineStages.name,
    })
    .from(leads)
    .innerJoin(
      crmPipelineStages,
      and(
        eq(crmPipelineStages.id, leads.pipelineStageId),
        eq(crmPipelineStages.isDeleted, false),
      ),
    )
    .leftJoin(
      crmPipelines,
      and(
        eq(crmPipelines.id, crmPipelineStages.pipelineId),
        eq(crmPipelines.isDeleted, false),
      ),
    )
    .where(
      and(
        eq(leads.storeId, scope.storeId),
        eq(leads.tenantId, scope.tenantId),
        eq(leads.isDeleted, false),
        inArray(leads.id, leadIds),
      ),
    );
  const stagesByLeadId = new Map<string, CrmConversationCycleLeadPipelineStage>(
    rows.map((row) => [
      row.leadId,
      {
        pipelineName: row.pipelineName ?? null,
        stageColor: row.stageColor,
        stageId: row.stageId,
        stageName: row.stageName,
      },
    ]),
  );
  return attachLeadPipelineStages(cycles, stagesByLeadId);
}
