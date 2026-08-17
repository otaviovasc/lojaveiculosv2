import type { CrmLeadSource, CrmLeadStatus } from "./productCrmTypes";

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

export const listFilterStatuses: Array<CrmLeadStatus | "all"> = [
  "all",
  ...pipelineStatuses,
  "archived",
];

export const sourceLabels: Record<CrmLeadSource, string> = {
  crm: "CRM",
  external_api: "API externa",
  manual: "Manual",
  olx: "OLX",
  other: "Outros",
  public_site: "Site",
  whatsapp: "WhatsApp",
};

export const sourceOptions: Array<CrmLeadSource | "all"> = [
  "all",
  "manual",
  "public_site",
  "whatsapp",
  "olx",
  "external_api",
  "crm",
  "other",
];
