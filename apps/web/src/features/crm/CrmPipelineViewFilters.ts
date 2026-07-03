import type { Pipeline } from "./crmPipelineStorage";
import { getLeadStageId, hasAssignedLeadOwner } from "./crmLeadData";
import type { ProductCrmLead } from "./productCrmTypes";

export type CustomFilters = {
  resposta: string[];
  origem: string[];
  responsavel: string[];
  semInteracao: string;
  fonte: string[];
};

type BaseClientFilters = {
  search: string;
  source: string;
  status: string;
};

export function getFilteredLeads(
  viewLeads: ProductCrmLead[],
  activePipeline: Pipeline | null,
  customFilters: CustomFilters,
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

  if (customFilters.resposta.length > 0) {
    rawLeads = rawLeads.filter((l) => {
      const isNew = l.status === "new";
      return (
        (customFilters.resposta.includes("no-response") && isNew) ||
        (customFilters.resposta.includes("responded") && !isNew)
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
        (Date.now() - new Date(l.createdAt).getTime()) /
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
    customFilters.resposta.length ||
    customFilters.origem.length ||
    customFilters.responsavel.length ||
    customFilters.semInteracao ||
    customFilters.fonte.length,
  );
}
