import type {
  CrmLeadSource,
  CrmLeadStatus,
  LeadActivityType,
} from "./productCrmTypes";

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

export const activityTypeLabels: Record<LeadActivityType, string> = {
  call: "Ligacao",
  email: "Email",
  note: "Nota",
  status_change: "Status",
  task: "Tarefa",
  whatsapp: "WhatsApp",
};

export const quickTaskOptions = [
  { hoursFromNow: 2, label: "Hoje" },
  { hoursFromNow: 24, label: "Amanha" },
  { hoursFromNow: 72, label: "Em 3 dias" },
] as const;
