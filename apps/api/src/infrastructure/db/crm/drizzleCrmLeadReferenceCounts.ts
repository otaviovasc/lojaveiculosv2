import { and, count, eq, inArray } from "drizzle-orm";
import { leads } from "@lojaveiculosv2/db";
import type { CrmRepository } from "../../../domains/crm/ports/crmRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export async function countLeadsByPipeline(
  db: DrizzleCrmClient,
  input: Parameters<CrmRepository["countLeadsByPipeline"]>[0],
) {
  const [row] = await db
    .select({ leadCount: count() })
    .from(leads)
    .where(
      and(
        eq(leads.pipelineId, input.pipelineId),
        eq(leads.storeId, input.storeId),
        eq(leads.tenantId, input.tenantId),
        eq(leads.isDeleted, false),
      ),
    );
  return row?.leadCount ?? 0;
}

export async function countLeadsByPipelineStages(
  db: DrizzleCrmClient,
  input: Parameters<CrmRepository["countLeadsByPipelineStages"]>[0],
) {
  if (!input.stageIds.length) return 0;
  const [row] = await db
    .select({ leadCount: count() })
    .from(leads)
    .where(
      and(
        inArray(leads.pipelineStageId, input.stageIds),
        eq(leads.storeId, input.storeId),
        eq(leads.tenantId, input.tenantId),
        eq(leads.isDeleted, false),
      ),
    );
  return row?.leadCount ?? 0;
}
