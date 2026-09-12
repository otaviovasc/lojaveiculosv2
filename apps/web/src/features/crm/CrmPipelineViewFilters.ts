import type { LeadFilters } from "./crmPipelineModels";
import type { Pipeline } from "./crmPipelineStorage";
import { getLeadStageId } from "./crmLeadData";
import type { CrmLeadSource, ProductCrmLead } from "./productCrmTypes";
import type { CustomFilters } from "./CrmPipelineToolbarTypes";

export type { CustomFilters };

type BaseClientFilters = LeadFilters;

export function getFilteredLeads(
  viewLeads: ProductCrmLead[],
  activePipeline: Pipeline | null,
  customFilters: CustomFilters,
  filters?: BaseClientFilters,
): ProductCrmLead[] {
  if (!activePipeline) return viewLeads;
  const stageIds = new Set(activePipeline.stages.map((s) => s.id));
  let rawLeads = viewLeads.filter((l) => {
    const leadStage = getLeadStageId(l);
    if (leadStage) return stageIds.has(leadStage);
    return (
      activePipeline.id === "vendas" &&
      [
        "new",
        "contacted",
        "qualified",
        "negotiating",
        "won",
        "lost",
        "archived",
      ].includes(l.status)
    );
  });

  if (filters?.humanAttendanceState && filters.humanAttendanceState !== "all") {
    rawLeads = rawLeads.filter(
      (l) => l.humanAttendanceState === filters.humanAttendanceState,
    );
  }

  if (customFilters.resposta.length > 0) {
    rawLeads = rawLeads.filter((l) => {
      const responded = l.responseState === "responded";
      return (
        (customFilters.resposta.includes("no-response") &&
          l.responseState === "no_response") ||
        (customFilters.resposta.includes("responded") && responded)
      );
    });
  }

  if (customFilters.semInteracao) {
    const days = parseInt(customFilters.semInteracao, 10);
    rawLeads = rawLeads.filter(
      (l) =>
        l.lastInteractionAt !== null &&
        (Date.now() - new Date(l.lastInteractionAt).getTime()) /
          (24 * 60 * 60 * 1000) >=
          days,
    );
  }

  return rawLeads;
}

export function hasAnyClientFilter(
  filters: BaseClientFilters,
  customFilters: CustomFilters,
) {
  return Boolean(
    filters.search.trim() ||
    filters.source !== "all" ||
    Boolean(filters.sources && filters.sources.length > 0) ||
    filters.status !== "all" ||
    (filters.humanAttendanceState && filters.humanAttendanceState !== "all") ||
    (filters.sortBy && filters.sortBy !== "created_at") ||
    (filters.responseState && filters.responseState !== "all") ||
    (typeof filters.inactiveDays === "number" && filters.inactiveDays > 0) ||
    Boolean(filters.assignee && filters.assignee !== "all") ||
    Boolean(filters.listingId) ||
    customFilters.resposta.length ||
    customFilters.origem.length ||
    Boolean(customFilters.responsavel && customFilters.responsavel !== "all") ||
    customFilters.semInteracao ||
    customFilters.veiculoId,
  );
}

export function customServerFilters(
  current: LeadFilters,
  custom: CustomFilters,
): LeadFilters {
  const sources =
    custom.origem.length > 0 ? (custom.origem as CrmLeadSource[]) : undefined;
  const assignee =
    custom.responsavel && custom.responsavel !== "all"
      ? custom.responsavel
      : undefined;
  const listingId = custom.veiculoId || undefined;

  return {
    ...current,
    assignee,
    inactiveDays: custom.semInteracao ? Number(custom.semInteracao) : null,
    listingId,
    responseState:
      custom.resposta.length === 1
        ? custom.resposta[0] === "responded"
          ? "responded"
          : "no_response"
        : "all",
    sources,
  };
}
