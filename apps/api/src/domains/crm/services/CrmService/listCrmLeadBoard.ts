import { assertPermission } from "../../../../shared/authorization.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CrmLead,
  CrmLeadCursor,
  LeadSource,
  LeadStatus,
} from "../../ports/crmRepository.js";
import {
  getCrmRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "./serviceSupport.js";

const permission = "lead.read";

export type ListCrmLeadBoardInput = {
  pipelineId: string;
  search?: string;
  source?: LeadSource;
  stageLimit?: number;
  status?: LeadStatus;
};

export type CrmLeadBoardStagePage = {
  items: readonly CrmLead[];
  nextCursor: CrmLeadCursor | null;
  pipelineStageId: string;
  total: number;
};

export async function listCrmLeadBoard(
  context: ServiceContext,
  input: ListCrmLeadBoardInput,
  ports: CrmServicePorts,
): Promise<readonly CrmLeadBoardStagePage[]> {
  assertPermission(context, permission);
  const scope = requireCrmScope(context);
  const stageLimit = input.stageLimit ?? 20;

  context.logger.info(
    "crm.leads.board.list.started",
    createServiceLogMetadata(context, {
      hasSearch: Boolean(input.search),
      pipelineId: input.pipelineId,
      searchLength: input.search?.length ?? 0,
      source: input.source ?? null,
      stageLimit,
      status: input.status ?? null,
    }),
  );

  const stages = await getCrmRepository(ports).listLeadBoard({
    pipelineId: input.pipelineId,
    ...(input.search ? { search: input.search } : {}),
    ...(input.source ? { source: input.source } : {}),
    stageLimit,
    ...(input.status ? { status: input.status } : {}),
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  const pages = stages.map((stage) => {
    const lastItem = stage.items.at(-1);
    return {
      items: stage.items,
      nextCursor:
        stage.total > stage.items.length && lastItem
          ? { id: lastItem.id, updatedAt: lastItem.updatedAt }
          : null,
      pipelineStageId: stage.pipelineStageId,
      total: stage.total,
    };
  });

  await context.audit.record({
    action: "crm.leads.board.list",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "store",
    metadata: {
      leadCount: pages.reduce((total, page) => total + page.items.length, 0),
      permission,
      stageCount: pages.length,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Listed CRM lead board",
  });

  return pages;
}
