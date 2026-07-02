import type { Pipeline } from "./crmPipelineStorage";
import type { ProductCrmLead } from "./productCrmTypes";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";

type CustomFilters = {
  resposta: string[];
  origem: string[];
  responsavel: string[];
  semInteracao: string;
  fonte: string[];
};

export function getFilteredLeads(
  viewLeads: ProductCrmLead[],
  activePipeline: Pipeline | null,
  customFilters: CustomFilters,
  vehicleOptions: LeadVehicleOption[],
): ProductCrmLead[] {
  if (!activePipeline) return viewLeads;
  const stageIds = new Set(activePipeline.stages.map((s) => s.id));
  let rawLeads = viewLeads.filter((l) => {
    const leadStage = l.metadata?.stageId as string | undefined;
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
      const hasOwner =
        l.assignedUserId || l.metadata?.userId || (l.metadata as any)?.owner;
      return (
        (customFilters.responsavel.includes("unassigned") && !hasOwner) ||
        (customFilters.responsavel.includes("kauan-massuia") && hasOwner)
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

  return rawLeads.map((lead, idx) => {
    if (vehicleOptions.length === 0) return lead;
    const nextMeta = { ...(lead.metadata ?? {}) };
    const v0 = vehicleOptions[0];
    const v1 = vehicleOptions[1];
    const v2 = vehicleOptions[2];
    const v3 = vehicleOptions[3];
    if (idx === 0 && v0) {
      nextMeta.listingIds = [v0.id];
    } else if (idx === 1 && v0 && v1) {
      nextMeta.listingIds = [v0.id, v1.id];
    } else if (idx === 2 && v0 && v1 && v2 && v3) {
      nextMeta.listingIds = [v0.id, v1.id, v2.id, v3.id];
    }
    return { ...lead, metadata: nextMeta };
  });
}
