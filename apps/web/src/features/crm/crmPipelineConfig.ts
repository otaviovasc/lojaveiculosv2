import type { CrmLeadStatus } from "./productCrmTypes";

export const statusLabels: Record<CrmLeadStatus, string> = {
  archived: "Arquivado",
  contacted: "Contactado",
  lost: "Perdido",
  negotiating: "Negociando",
  new: "Novo",
  qualified: "Qualificado",
  won: "Ganho",
};

export const pipelineStatuses: CrmLeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "negotiating",
  "won",
  "lost",
];
