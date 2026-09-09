import type { LeadFilters } from "./crmPipelineModels";
import type { Pipeline } from "./crmPipelineStorage";
import { getLeadStageId, hasAssignedLeadOwner } from "./crmLeadData";
import type { ProductCrmLead } from "./productCrmTypes";

export type CustomFilters = {
  resposta: string[];
  origem: string[];
  responsavel: string[];
  semInteracao: string;
  fonte: string[];
  veiculoId?: string | undefined;
};

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

  if (customFilters.origem.length > 0) {
    rawLeads = rawLeads.filter((l) => {
      const src = l.source?.toLowerCase() || "";
      return customFilters.origem.some((v) => src === v.toLowerCase());
    });
  }

  if (customFilters.responsavel.length > 0) {
    rawLeads = rawLeads.filter((l) => {
      const hasOwner = hasAssignedLeadOwner(l);
      return (
        (customFilters.responsavel.includes("unassigned") && !hasOwner) ||
        (customFilters.responsavel.includes("assigned") && hasOwner)
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

  if (customFilters.fonte.length > 0) {
    rawLeads = rawLeads.filter((l) => {
      const src = l.source?.toLowerCase() || "";
      return customFilters.fonte.some((v) => src === v.toLowerCase());
    });
  }

  if (customFilters.veiculoId) {
    rawLeads = rawLeads.filter((l) => l.listingId === customFilters.veiculoId);
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
    filters.status !== "all" ||
    (filters.humanAttendanceState && filters.humanAttendanceState !== "all") ||
    (filters.sortBy && filters.sortBy !== "created_at") ||
    (filters.responseState && filters.responseState !== "all") ||
    (typeof filters.inactiveDays === "number" && filters.inactiveDays > 0) ||
    customFilters.resposta.length ||
    customFilters.origem.length ||
    customFilters.responsavel.length ||
    customFilters.semInteracao ||
    customFilters.fonte.length ||
    customFilters.veiculoId,
  );
}

export function customServerFilters(
  current: LeadFilters,
  custom: CustomFilters,
): LeadFilters {
  return {
    ...current,
    responseState:
      custom.resposta.length === 1
        ? custom.resposta[0] === "responded"
          ? "responded"
          : "no_response"
        : "all",
    inactiveDays: custom.semInteracao ? Number(custom.semInteracao) : null,
  };
}
