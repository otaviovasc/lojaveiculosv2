import type {
  ProductCrmApi,
  ProductCrmLeadPage,
  ProductCrmLeadQuery,
} from "./productCrmApi";
import type { LeadFilters } from "./crmPipelineModels";
import type { Pipeline } from "./crmPipelineStorage";

export const CRM_STAGE_PAGE_SIZE = 20;

export type CrmLeadBoardPages = Record<string, ProductCrmLeadPage>;

export async function loadCrmLeadBoard(
  api: ProductCrmApi,
  pipeline: Pipeline,
  filters: LeadFilters,
): Promise<CrmLeadBoardPages> {
  const result = await api.listLeadBoard({
    pipelineId: pipeline.id,
    stageLimit: CRM_STAGE_PAGE_SIZE,
    ...createCrmLeadFilters(filters),
  });
  const pages = new Map(
    result.stages.map((stage) => [stage.pipelineStageId, stage]),
  );
  return Object.fromEntries(
    pipeline.stages.map((stage) => [
      stage.id,
      pages.get(stage.id) ?? { leads: [], nextCursor: null, total: 0 },
    ]),
  ) as CrmLeadBoardPages;
}

export function loadCrmLeadStagePage(
  api: ProductCrmApi,
  pipelineId: string,
  pipelineStageId: string,
  filters: LeadFilters,
  cursor?: string,
) {
  return api.listLeadPage(
    createCrmLeadBoardQuery(pipelineId, pipelineStageId, filters, cursor),
  );
}

export function createCrmLeadBoardQuery(
  pipelineId: string,
  pipelineStageId: string,
  filters: LeadFilters,
  cursor?: string,
): ProductCrmLeadQuery {
  return {
    ...(cursor ? { cursor } : {}),
    limit: CRM_STAGE_PAGE_SIZE,
    pipelineId,
    pipelineStageId,
    ...createCrmLeadFilters(filters),
  };
}

function createCrmLeadFilters(filters: LeadFilters) {
  const search = filters.search.trim();
  return {
    ...(search ? { search } : {}),
    ...(filters.source !== "all" ? { source: filters.source } : {}),
    ...(filters.status !== "all" ? { status: filters.status } : {}),
  };
}
